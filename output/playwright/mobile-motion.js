async (page) => {
  const results=[];
  await page.goto('http://localhost:4321/?review=mobile');
  for(const width of [320,375,768,1440]) {
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(800);
    results.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(document.querySelector('[data-grid]')).gridTemplateColumns,heroWidth:document.querySelector('[data-hero-texto]').getBoundingClientRect().width,blobWidth:document.querySelector('[data-viajero] path').getBoundingClientRect().width})));
    if(width===375) await page.screenshot({path:'output/playwright/mobile-hero.png'});
  }
  await page.setViewportSize({width:375,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(700);
  const before=await page.locator('[data-viajero] path').getAttribute('d');
  await page.waitForTimeout(600);
  const after=await page.locator('[data-viajero] path').getAttribute('d');
  await page.getByRole('button',{name:'Belleza',exact:true}).click();
  const reduced=await page.evaluate(()=>({count:document.querySelectorAll('.celda:not(.oculta)').length,hiddenCards: Array.from(document.querySelectorAll('.celda:not(.oculta) [data-tarjeta]')).filter(c=>getComputedStyle(c).opacity==='0').length,gap:document.querySelector('footer').getBoundingClientRect().top-document.querySelector('.celda:not(.oculta)').getBoundingClientRect().bottom,playing:Array.from(document.querySelectorAll('video')).filter(v=>!v.paused).length}));
  reduced.morphStopped=before===after;
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/mobile-footer.png'});
  await page.getByRole('link',{name:/Kelly Cedillo, Maquilladora/}).click();
  await page.waitForURL('**/emprendedores/kelly-cedillo/');
  await page.waitForTimeout(500);
  const profile=await page.evaluate(()=>({logo:document.querySelectorAll('img[alt="Diseña Futuro"]').length,footer:!!document.querySelector('footer'),playing:Array.from(document.querySelectorAll('video')).filter(v=>!v.paused).length,overflow:document.documentElement.scrollWidth>innerWidth}));
  await page.getByRole('link',{name:'Todos los emprendedores'}).click();
  await page.waitForTimeout(600);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Los Lojas',exact:true}).click();
  await page.waitForTimeout(1100);
  const back=await page.evaluate(()=>({count:document.querySelectorAll('.celda:not(.oculta)').length,status:document.querySelector('[data-conteo]').textContent.trim(),height:document.querySelector('[data-grid]').style.height,footerGap:document.querySelector('footer').getBoundingClientRect().top-Math.max(...Array.from(document.querySelectorAll('.celda:not(.oculta)')).map(c=>c.getBoundingClientRect().bottom))}));
  await page.evaluate(result=>window.__mobile=result,{results,reduced,profile,back});
}
