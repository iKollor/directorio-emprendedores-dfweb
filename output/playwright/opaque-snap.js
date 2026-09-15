async (page) => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://localhost:4321/?review=snap-check');
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForTimeout(900);
  const initial=await page.evaluate(()=>({opacity:getComputedStyle(document.querySelector('[data-viajero]')).opacity,blur:getComputedStyle(document.querySelector('[data-viajero] svg')).filter,filters:getComputedStyle(document.querySelector('[data-filtros]')).backgroundColor,countBackground:getComputedStyle(document.querySelector('.resultados')).backgroundColor,snaps:document.querySelectorAll('[data-snap-scroll]').length,pendingOpacity:getComputedStyle(document.querySelector('.tarjeta.pendiente')).opacity}));
  const first=await page.evaluate(()=>{const c=document.querySelector('.celda');return c.getBoundingClientRect().top+scrollY+c.querySelector('.retrato').offsetWidth/2-innerHeight/2;});
  await page.evaluate(y=>window.scrollTo(0,y),first+2);
  await page.waitForTimeout(1200);
  const atFirst=await page.evaluate(()=>({blur:getComputedStyle(document.querySelector('[data-viajero] svg')).filter,opacity:getComputedStyle(document.querySelector('[data-viajero]')).opacity}));
  const motion=await page.evaluate(async () => {
    const b=document.querySelector('[data-viajero]');
    const end=Number(document.querySelector('[data-snap-scroll]').dataset.snapScroll);
    const start=scrollY;
    let previous=new DOMMatrix(getComputedStyle(b).transform).e,maxStep=0;
    for(let i=1;i<=90;i++){
      window.scrollTo(0,start+(end-start)*i/90);
      await new Promise(requestAnimationFrame);
      const x=new DOMMatrix(getComputedStyle(b).transform).e;
      maxStep=Math.max(maxStep,Math.abs(x-previous));previous=x;
    }
    return {distance:end-start,maxHorizontalStep:maxStep};
  });
  const snapTarget=await page.locator('[data-snap-scroll]').first().getAttribute('data-snap-scroll');
  await page.evaluate(y=>window.scrollTo(0,y-45),Number(snapTarget));
  await page.waitForTimeout(150);
  await page.mouse.wheel(0,2);
  await page.waitForTimeout(2400);
  const desktopSnap=await page.evaluate(target=>({target,actual:scrollY,error:Math.abs(scrollY-target)}),Number(snapTarget));
  await page.getByRole('button',{name:'Sabanilla',exact:true}).click();
  await page.waitForTimeout(1100);
  const filtered=await page.evaluate(()=>({count:document.querySelectorAll('.celda:not(.oculta)').length,snaps:document.querySelectorAll('[data-snap-scroll]').length,gap:document.querySelector('footer').getBoundingClientRect().top-Math.max(...Array.from(document.querySelectorAll('.celda:not(.oculta)')).map(c=>c.getBoundingClientRect().bottom))}));
  await page.getByRole('button',{name:/Limpiar filtros/}).click();
  await page.waitForTimeout(1100);
  await page.setViewportSize({width:375,height:900});
  await page.waitForTimeout(1100);
  const mobile=await page.evaluate(()=>({snaps:document.querySelectorAll('[data-snap-scroll]').length,overflow:document.documentElement.scrollWidth>innerWidth}));
  const target=Number(await page.locator('[data-snap-scroll]').first().getAttribute('data-snap-scroll'));
  await page.evaluate(y=>window.scrollTo(0,y-40),target);
  await page.waitForTimeout(150);
  await page.mouse.move(180,450);
  await page.mouse.wheel(0,2);
  await page.waitForTimeout(2400);
  mobile.error=await page.evaluate(y=>Math.abs(scrollY-y),target);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(500);
  await page.getByRole('button',{name:'Belleza',exact:true}).click();
  const reduced=await page.evaluate(()=>({count:document.querySelectorAll('.celda:not(.oculta)').length,opacity:getComputedStyle(document.querySelector('[data-viajero]')).opacity}));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(result=>window.__snapCheck=result,{initial,atFirst,motion,desktopSnap,filtered,mobile,reduced,errors});
}
