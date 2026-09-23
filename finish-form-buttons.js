(function () {
  const forms = [
    ['CUB','Кубообразная рейка','assets/rail-types/brg-01-cube.png'],
    ['CLS','Бесшовная рейка','assets/rail-types/brg-02-seamless.png'],
    ['RHM','Ромбовидная рейка','assets/rail-types/brg-03-diamond.png'],
    ['V','V-образная рейка','assets/rail-types/brg-04-v.png'],
    ['S','S-образная рейка','assets/rail-types/brg-05-s.png'],
    ['L','L-образная рейка','assets/rail-types/brg-06-l.png'],
    ['ACO','Акустическая рейка','assets/rail-types/brg-07-acoustic.png'],
    ['WAV','Волнообразная рейка','assets/rail-types/brg-08-wave.png']
  ];
  const mountImages={CUB:'assets/rail-types/brg-01-mount.svg',CLS:'assets/rail-types/brg-02-mount.svg',RHM:'assets/rail-types/brg-03-mount.svg',V:'assets/rail-types/brg-04-mount.svg',S:'assets/rail-types/brg-05-mount.svg',L:'assets/rail-types/brg-06-mount.svg',ACO:'assets/rail-types/brg-07-mount.svg',WAV:'assets/rail-types/brg-08-mount.svg'};
  const cache = new Map();
  const loadImage = src => {
    if (!cache.has(src)) cache.set(src, new Promise((resolve,reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
    }));
    return cache.get(src);
  };
  const clamp = value => Math.max(0,Math.min(1,value));
  const textureSource = card => getComputedStyle(card).getPropertyValue('--decor').match(/url\(["']?([^"')]+)["']?\)/)?.[1];

  document.querySelectorAll('.decor-card').forEach(card => {
    const visual = card.querySelector('.decor-ceiling');
    const label = visual.querySelector('small');
    const canvas = document.createElement('canvas');
    canvas.className = 'finish-form-canvas';
    canvas.setAttribute('aria-hidden','true');
    visual.append(canvas);
    let renderToken = 0;

    const picker = document.createElement('div');
    picker.className = 'finish-form-picker';
    picker.innerHTML = '<span>ФОРМА РЕЙКИ</span><div role="group" aria-label="Выберите форму рейки">' + forms.map(([code,name],index) => `<button type="button" title="${name}" aria-label="${name}" aria-pressed="${index === 0}" class="${index === 0 ? 'active' : ''}" data-form="${code}">${code}</button>`).join('') + '</div>';
    card.querySelector('.decor-info').append(picker);
    const mountButton=document.createElement('button');
    mountButton.type='button';
    mountButton.className='mount-trigger finish-mount-trigger';
    mountButton.dataset.image=mountImages.CUB;
    mountButton.dataset.title='CUB';
    mountButton.innerHTML='<span class="finish-mount-code">CUB</span> СХЕМА КРЕПЛЕНИЯ <b>↗</b>';
    card.querySelector('.decor-info').append(mountButton);

    async function renderForm(form) {
      const token = ++renderToken;
      visual.classList.add('is-rendering');
      const [model,texture] = await Promise.all([loadImage(form[2]),loadImage(textureSource(card))]);
      if (token !== renderToken) return;
      canvas.width = 1920;
      canvas.height = Math.round(canvas.width * model.naturalHeight / model.naturalWidth);
      const context = canvas.getContext('2d',{willReadFrequently:true});
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(model,0,0,canvas.width,canvas.height);
      if (!['CUB','ACO'].includes(form[0])) {
        canvas.classList.add('visible');
        visual.classList.remove('is-rendering');
        label.textContent=`${form[0]} · ${form[1].toUpperCase()}`;
        visual.setAttribute('aria-label',`${form[1]} в исходном металлическом исполнении`);
        return;
      }
      const original = context.getImageData(0,0,canvas.width,canvas.height);

      const layer = document.createElement('canvas'); layer.width=canvas.width; layer.height=canvas.height;
      const lctx = layer.getContext('2d',{willReadFrequently:true});
      const tile = document.createElement('canvas'); tile.width=1200; tile.height=Math.round(tile.width*texture.naturalHeight/texture.naturalWidth);
      const tctx=tile.getContext('2d'); tctx.imageSmoothingEnabled=true; tctx.imageSmoothingQuality='high'; tctx.drawImage(texture,0,0,tile.width,tile.height);
      const pattern=lctx.createPattern(tile,'repeat');
      if(pattern?.setTransform) pattern.setTransform(new DOMMatrix().rotate(27));
      lctx.fillStyle=pattern; lctx.fillRect(0,0,layer.width,layer.height);
      const wood=lctx.getImageData(0,0,layer.width,layer.height).data;
      const output=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height);
      const stride=canvas.width*4;
      for(let i=0;i<output.data.length;i+=4){
        const r=original.data[i],g=original.data[i+1],b=original.data[i+2];
        const light=r*.2126+g*.7152+b*.0722;
        const saturation=Math.max(r,g,b)-Math.min(r,g,b);
        const right=i+12<output.data.length?i+12:i,down=i+stride*3<output.data.length?i+stride*3:i;
        const rl=original.data[right]*.2126+original.data[right+1]*.7152+original.data[right+2]*.0722;
        const dl=original.data[down]*.2126+original.data[down+1]*.7152+original.data[down+2]*.0722;
        const edge=Math.max(Math.abs(light-rl),Math.abs(light-dl));
        const mask=clamp((light-126)/84)*clamp(1-saturation/58)*clamp(1-edge/30);
        if(mask<.025) continue;
        const shade=.3+light/255*.82,highlight=clamp((light-188)/67)*28;
        output.data[i]=r*(1-mask)+Math.min(255,wood[i]*shade+highlight)*mask;
        output.data[i+1]=g*(1-mask)+Math.min(255,wood[i+1]*shade+highlight)*mask;
        output.data[i+2]=b*(1-mask)+Math.min(255,wood[i+2]*shade+highlight)*mask;
      }
      context.putImageData(output,0,0);
      canvas.classList.add('visible');
      visual.classList.remove('is-rendering');
      label.textContent=`${form[0]} · ${form[1].toUpperCase()}`;
      visual.setAttribute('aria-label',`${form[1]} в покрытии ${card.querySelector('.decor-info h3').textContent}`);
    }

    picker.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      picker.querySelectorAll('button').forEach(item => {
        const selected=item===button; item.classList.toggle('active',selected); item.setAttribute('aria-pressed',String(selected));
      });
      const form=forms.find(item=>item[0]===button.dataset.form);
      card.dataset.railForm=form[0];
      mountButton.dataset.image=mountImages[form[0]];
      mountButton.dataset.title=form[0];
      mountButton.querySelector('.finish-mount-code').textContent=form[0];
      renderForm(form);
    });
  });
})();
