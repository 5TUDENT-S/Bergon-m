(function () {
  const textures = [
    ['D01','assets/finishes/d01-rustic-oak-4k.webp'], ['D02','assets/finishes/d02-rosewood-4k.webp'],
    ['D03','assets/finishes/d03-textured-bog-oak-4k.webp'], ['D04','assets/finishes/d04-chestnut-4k.webp'],
    ['D05','assets/finishes/d05-sonoma-oak-4k.webp'], ['D06','assets/finishes/d06-grey-oak-4k.webp'],
    ['D07','assets/finishes/d07-siberian-pine-4k.webp'], ['D08','assets/finishes/d08-cherry-4k.webp'],
    ['D09','assets/finishes/d09-cedar-4k.webp'], ['D10','assets/finishes/d10-bog-oak-4k.webp'],
    ['D11','assets/finishes/d11-bleached-oak-4k.webp'], ['D12','assets/finishes/d12-textured-pine-4k.webp'],
    ['D13','assets/finishes/d13-ash-4k.webp']
  ];
  const ral = {
    'RAL 9003':'#f4f4f0', 'RAL 9005':'#0a0a0a', 'RAL 7016':'#383e42', 'RAL 7024':'#45494e',
    'RAL 7035':'#d7d7d2', 'RAL 7047':'#d0d0cf', 'RAL 9006':'#a5a5a5', 'RAL 1015':'#e6d9bd',
    'RAL 3005':'#5e2028', 'RAL 5005':'#154889', 'RAL 6005':'#0f4336', 'RAL 8017':'#45322e'
  };

  const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
  const clamp = value => Math.max(0, Math.min(1, value));
  const hexRgb = value => [parseInt(value.slice(1,3),16), parseInt(value.slice(3,5),16), parseInt(value.slice(5,7),16)];

  document.querySelectorAll('.rail-card').forEach(card => {
    const visual = card.querySelector('.rail-visual');
    const sourceImage = visual?.querySelector('img');
    if (!visual || !sourceImage) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'rail-finish-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    visual.append(canvas);

    const panel = document.createElement('div');
    panel.className = 'rail-config';
    panel.innerHTML = '<div class="rail-config-title"><b>ПРИМЕРЬТЕ ПОКРЫТИЕ</b><span>Дерево или цвет RAL</span></div><div class="rail-textures"></div><label class="rail-ral"><span>ЦВЕТ RAL</span><select aria-label="Выберите цвет RAL"><option value="">Исходный металл</option></select></label>';
    visual.after(panel);

    const textureList = panel.querySelector('.rail-textures');
    const reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'rail-swatch rail-swatch-reset active'; reset.textContent = 'METAL';
    textureList.append(reset);
    textures.forEach(([code, src]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'rail-swatch'; button.textContent = code;
      button.style.backgroundImage = `linear-gradient(rgba(0,0,0,.16),rgba(0,0,0,.16)),url('${src}')`;
      button.dataset.texture = src; button.title = `Текстура ${code}`;
      textureList.append(button);
    });

    const select = panel.querySelector('select');
    Object.entries(ral).forEach(([name, color]) => {
      const option = document.createElement('option'); option.value = color; option.textContent = name; select.append(option);
    });

    let originalData;
    const prepare = async () => {
      const image = sourceImage.complete && sourceImage.naturalWidth ? sourceImage : await loadImage(sourceImage.src);
      const renderWidth = 3840;
      canvas.width = renderWidth;
      canvas.height = Math.round(renderWidth * image.naturalHeight / image.naturalWidth);
      const context = canvas.getContext('2d', { willReadFrequently:true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      originalData = context.getImageData(0, 0, canvas.width, canvas.height);
    };
    let ready;
    const getReady = () => ready || (ready = prepare());

    const createTextureLayer = async src => {
      const texture = await loadImage(src);
      const layer = document.createElement('canvas');
      layer.width = canvas.width; layer.height = canvas.height;
      const layerContext = layer.getContext('2d', { willReadFrequently:true });
      layerContext.imageSmoothingEnabled = true;
      layerContext.imageSmoothingQuality = 'high';

      // Масштаб волокон подобран под реальную ширину профиля: рисунок не
      // превращается в крупный фрагмент и сохраняет мелкую структуру древесины.
      const tileWidth = Math.round(canvas.width * .72);
      const tileHeight = Math.max(1, Math.round(tileWidth * texture.naturalHeight / texture.naturalWidth));
      const tile = document.createElement('canvas');
      tile.width = tileWidth; tile.height = tileHeight;
      const tileContext = tile.getContext('2d');
      tileContext.imageSmoothingEnabled = true;
      tileContext.imageSmoothingQuality = 'high';
      tileContext.drawImage(texture, 0, 0, tile.width, tile.height);

      // Волокна идут вдоль перспективной оси профиля, а не поперёк рейки.
      const pattern = layerContext.createPattern(tile, 'repeat');
      if (pattern?.setTransform) pattern.setTransform(new DOMMatrix().rotate(27));
      layerContext.fillStyle = pattern;
      layerContext.fillRect(0, 0, layer.width, layer.height);
      return layerContext.getImageData(0, 0, layer.width, layer.height).data;
    };

    const render = async coating => {
      panel.classList.add('is-rendering');
      await getReady();
      const context = canvas.getContext('2d', { willReadFrequently:true });
      const output = new ImageData(new Uint8ClampedArray(originalData.data), canvas.width, canvas.height);
      const textureData = coating?.texture ? await createTextureLayer(coating.texture) : null;
      const rgb = coating?.color ? hexRgb(coating.color) : null;
      const rowStride = canvas.width * 4;
      for (let i = 0; i < output.data.length; i += 4) {
        const r = originalData.data[i], g = originalData.data[i+1], b = originalData.data[i+2];
        const light = r*.2126 + g*.7152 + b*.0722;
        const saturation = Math.max(r,g,b) - Math.min(r,g,b);
        // Покрываем только светлые внешние плоскости. Тёмные внутренние
        // поверхности, пазы, полости и монтажные элементы остаются металлом.
        const right = i + 12 < output.data.length ? i + 12 : i;
        const down = i + rowStride * 3 < output.data.length ? i + rowStride * 3 : i;
        const rightLight = originalData.data[right]*.2126 + originalData.data[right+1]*.7152 + originalData.data[right+2]*.0722;
        const downLight = originalData.data[down]*.2126 + originalData.data[down+1]*.7152 + originalData.data[down+2]*.0722;
        const edge = Math.max(Math.abs(light-rightLight), Math.abs(light-downLight));
        const edgeGuard = clamp(1 - edge / 28);
        const outerSurface = clamp((light - 128) / 82);
        const neutralMetal = clamp(1 - saturation / 58);
        const mask = outerSurface * neutralMetal * edgeGuard;
        if (mask < .03) continue;
        const shade = .30 + light / 255 * .82;
        const highlight = clamp((light - 184) / 71) * 34;
        const target = textureData ? [textureData[i],textureData[i+1],textureData[i+2]] : rgb;
        output.data[i] = r*(1-mask) + Math.min(255, target[0]*shade + highlight)*mask;
        output.data[i+1] = g*(1-mask) + Math.min(255, target[1]*shade + highlight)*mask;
        output.data[i+2] = b*(1-mask) + Math.min(255, target[2]*shade + highlight)*mask;
      }
      context.putImageData(output, 0, 0);
      canvas.classList.add('visible');
      panel.classList.remove('is-rendering');
    };

    textureList.addEventListener('click', async event => {
      const button = event.target.closest('.rail-swatch');
      if (!button) return;
      textureList.querySelectorAll('.rail-swatch').forEach(item => item.classList.toggle('active', item === button));
      select.value = '';
      if (!button.dataset.texture) { canvas.classList.remove('visible'); return; }
      await render({ texture:button.dataset.texture });
    });
    select.addEventListener('change', async () => {
      textureList.querySelectorAll('.rail-swatch').forEach(item => item.classList.remove('active'));
      if (!select.value) { reset.classList.add('active'); canvas.classList.remove('visible'); return; }
      await render({ color:select.value });
    });
  });
})();
