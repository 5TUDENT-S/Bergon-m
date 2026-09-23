(function () {
  const card=document.querySelector('.ral-cube-card');
  if(!card) return;
  const colors={
    '1013':['#e9e5ce','Жемчужно-белый'],'1015':['#e6d9bd','Светлая слоновая кость'],'3005':['#5e2028','Винно-красный'],'3009':['#6d342d','Оксид красный'],
    '5002':['#20214f','Ультрамариново-синий'],'5005':['#154889','Сигнальный синий'],'6005':['#0f4336','Зелёный мох'],'6007':['#283424','Бутылочно-зелёный'],
    '7016':['#383e42','Антрацитово-серый'],'7024':['#45494e','Графитовый серый'],'7035':['#d7d7d2','Светло-серый'],'7047':['#d0d0cf','Телегрей 4'],
    '8017':['#45322e','Шоколадно-коричневый'],'8028':['#4c2f27','Терракотово-коричневый'],'9003':['#f4f4f0','Сигнальный белый'],'9005':['#0a0a0a','Чёрный янтарь'],
    '9006':['#a5a5a5','Бело-алюминиевый'],'9007':['#8f8f8c','Тёмно-алюминиевый'],'9010':['#f1eee4','Чистый белый'],'9016':['#f6f6f3','Транспортный белый']
  };
  const canvas=card.querySelector('canvas'),status=card.querySelector('.ral-cube-status');
  const swatches=card.querySelector('.ral-cube-swatches');
  const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
  const clamp=value=>Math.max(0,Math.min(1,value));
  const hexRgb=value=>[parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)];
  let original;
  const ready=(async()=>{
    const image=await loadImage('assets/rail-types/brg-01-cube.png');
    canvas.width=3840;canvas.height=Math.round(canvas.width*image.naturalHeight/image.naturalWidth);
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);
    original=context.getImageData(0,0,canvas.width,canvas.height);
  })();
  async function render(code){
    await ready;
    const item=colors[code];
    if(!item){status.textContent='Код пока не добавлен · выберите вариант из списка';status.classList.add('error');return;}
    status.classList.remove('error');status.textContent=`RAL ${code} · ${item[1]}`;
    const visual=card.querySelector('.ral-cube-visual');
    visual.style.setProperty('--ral-accent',item[0]);
    const sourceRgb=hexRgb(item[0]);
    const colorLight=sourceRgb[0]*.2126+sourceRgb[1]*.7152+sourceRgb[2]*.0722;
    const isLightFinish=colorLight>185;
    visual.classList.toggle('is-light-finish',isLightFinish);
    const colorBoost=colorLight<185?1.38:1.08;
    const rgb=sourceRgb.map(channel=>Math.max(0,Math.min(255,colorLight+(channel-colorLight)*colorBoost)));
    const output=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height),stride=canvas.width*4;
    for(let i=0;i<output.data.length;i+=4){
      const r=original.data[i],g=original.data[i+1],b=original.data[i+2],light=r*.2126+g*.7152+b*.0722,sat=Math.max(r,g,b)-Math.min(r,g,b);
      const right=i+12<output.data.length?i+12:i,down=i+stride*3<output.data.length?i+stride*3:i;
      const rl=original.data[right]*.2126+original.data[right+1]*.7152+original.data[right+2]*.0722,dl=original.data[down]*.2126+original.data[down+1]*.7152+original.data[down+2]*.0722;
      const pixel=i/4,px=(pixel%canvas.width)/canvas.width*519,py=Math.floor(pixel/canvas.width)/canvas.height*475;
      const sideSurface=px<342&&py>52+px*.39&&py<270+px*.46;
      const frontSurface=px>=326&&px<451&&py>148&&py<430;
      const topSurface=py>18+px*.37&&py<80+px*.43&&px<451;
      const objectSurface=sideSurface||frontSurface||topSurface;
      const mask=objectSurface?clamp((light-48)/92)*clamp(1-sat/88):0;
      if(mask<.025)continue;
      const finishMask=clamp(mask*1.5);
      output.data[i]=r*(1-finishMask)+rgb[0]*finishMask;
      output.data[i+1]=g*(1-finishMask)+rgb[1]*finishMask;
      output.data[i+2]=b*(1-finishMask)+rgb[2]*finishMask;
    }
    canvas.getContext('2d').putImageData(output,0,0);
    swatches.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.ral===code));
  }
  Object.entries(colors).forEach(([code,[color,name]])=>{const button=document.createElement('button');button.type='button';button.dataset.ral=code;button.title=`RAL ${code} · ${name}`;button.setAttribute('aria-label',button.title);button.innerHTML=`<i style="background:${color}"></i><span>RAL ${code}</span>`;swatches.append(button);});
  swatches.addEventListener('click',event=>{const button=event.target.closest('button');if(button)render(button.dataset.ral);});
  render('9003');
})();
