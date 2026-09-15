async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4321/?review=desktop');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'output/playwright/desktop-hero.png' });
  const initial = await page.evaluate(() => {
    const h = document.querySelector('[data-hero-texto]').getBoundingClientRect();
    const b = document.querySelector('[data-viajero] path').getBoundingClientRect();
    return { heroWidth: h.width, blobWidth: b.width, heroHeight: h.height, blobHeight: b.height, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  const samples = [];
  async function filter(group, value) {
    const sample = await page.evaluate(async ({group,value}) => {
      const button = Array.from(document.querySelectorAll('[data-filtro]')).find(b=>b.dataset.filtro===group && b.dataset.valor===value);
      button.click();
      let minGap=Infinity, minGridGap=Infinity;
      const start=performance.now();
      while(performance.now()-start<1100) {
        await new Promise(requestAnimationFrame);
        const cards=Array.from(document.querySelectorAll('.celda')).filter(c=>getComputedStyle(c).display!=='none' && Number(getComputedStyle(c).opacity)>.01);
        if(cards.length) {
          const bottom=Math.max(...cards.map(c=>c.getBoundingClientRect().bottom));
          minGap=Math.min(minGap,document.querySelector('footer').getBoundingClientRect().top-bottom);
          minGridGap=Math.min(minGridGap,document.querySelector('[data-grid]').getBoundingClientRect().bottom-bottom);
        }
      }
      const visible=Array.from(document.querySelectorAll('.celda:not(.oculta)'));
      const stale=visible.filter(c=>getComputedStyle(c).position==='absolute'||Number(getComputedStyle(c).opacity)<.9);
      return {group,value,count:visible.length,status:document.querySelector('[data-conteo]').textContent.trim(),minGap,minGridGap,stale:stale.length,cols:visible.map(c=>c.dataset.columna),height:document.querySelector('[data-grid]').style.height};
    }, {group,value});
    samples.push(sample);
  }
  for (const value of ['belleza','construccion','confeccion','comercio','agropecuario','pendiente','todas']) await filter('categoria',value);
  await filter('comunidad','Sabanilla');
  await filter('categoria','agropecuario');
  await page.screenshot({path:'output/playwright/empty.png',fullPage:true});
  await page.getByRole('button',{name:'Ver todos los emprendedores'}).click();
  await page.waitForTimeout(1100);
  await page.evaluate(async () => {
    const buttons=Array.from(document.querySelectorAll('[data-filtro="categoria"]'));
    for(const b of [...buttons,...buttons].reverse()){b.click();await new Promise(r=>setTimeout(r,45));}
  });
  await page.waitForTimeout(1200);
  const rapid=await page.evaluate(()=>({count:document.querySelectorAll('.celda:not(.oculta)').length,absolute:document.querySelectorAll('.celda[style*="position: absolute"]').length,height:document.querySelector('[data-grid]').style.height}));
  await filter('categoria','belleza');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({path:'output/playwright/desktop-footer.png'});
  await page.evaluate(result => window.__regression = result, {initial,samples,rapid,errors});
}
