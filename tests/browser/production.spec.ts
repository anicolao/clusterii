import {test,expect} from '@playwright/test';
import {login,grantDeveloper,geometry} from './helpers';
test('four commanders receive authoritative production after the real scheduled tick',async({browser,request},info)=>{
 test.setTimeout(33*60*1000);const contexts=[],pages=[];let url='';
 try {
  for(let i=0;i<4;i++) {
   const context=await browser.newContext();contexts.push(context);const page=await context.newPage();pages.push(page);const email=`production-ui-${i}-${Date.now()}@example.test`;
   await login(page,email);await page.getByLabel('Commander name').fill(`Production envoy ${i+1}`);await page.getByRole('button',{name:'Save identity'}).click();await expect(page.getByRole('status')).toContainText('Identity saved');await grantDeveloper(email);await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Play',exact:true}).click();
  }
  for(let i=0;i<4;i++) {
   const page=pages[i];if(i===0){await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.getByLabel('Campaign name').fill(`Production dawn ${Date.now()}`);await page.getByRole('button',{name:'Create galaxy'}).click();await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();url=page.url();}else await page.goto(url);
   await page.getByRole('radio',{name:new RegExp(['Heliac Assembly','Pelagic Concord','Vesper Synod','Dracon League'][i])}).check();await page.getByRole('button',{name:'Claim your seat'}).click();await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
  }
  await pages[0].getByRole('button',{name:'Economy',exact:true}).click();await expect(pages[0].getByRole('dialog',{name:'Empire economy panel'})).toContainText('Production begins fifteen minutes after home assignment.');
  let remaining=900000-Date.now()%900000+100;console.log(`Production journey: waiting ${Math.ceil(remaining/1000)}s for actual campaign start.`);await new Promise(r=>setTimeout(r,remaining));
  const deliver=async(name:string)=>{const response=await request.post(`http://127.0.0.1:15001/demo-clusterii/us-central1/${name}-0`,{headers:{'X-CloudScheduler-JobName':'emulator-production-journey','X-CloudScheduler-ScheduleTime':new Date().toISOString()}});expect(response.ok()).toBe(true);};
  await deliver('startScheduledCampaigns');
  for(const page of pages){await expect(page.getByText('Campaign begun',{exact:true})).toBeVisible();if(page!==pages[0])await page.getByRole('button',{name:'Economy',exact:true}).click();await expect(page.getByRole('dialog',{name:'Empire economy panel'})).toContainText('First production pending');}
  const researchPanel=pages[0].getByRole('dialog',{name:'Empire economy panel'});
  await researchPanel.getByRole('radio',{name:/investing/}).check();
  for(const [width,height] of [[393,852],[1440,1000],[1280,720],[3840,2160]]) {
    await pages[0].setViewportSize({width,height});await researchPanel.getByRole('radio',{name:/investing/}).scrollIntoViewIfNeeded();
    const commit=await researchPanel.getByRole('button',{name:'Queue investing',exact:true}).boundingBox();expect(commit!.y).toBeGreaterThanOrEqual(0);expect(commit!.y+commit!.height).toBeLessThanOrEqual(height);
    await researchPanel.getByRole('radio',{name:/investing/}).focus();const tracks=['scanning','navigation','terraforming','investing','formations','melee','recruiting','innovation'];
    for(let step=1;step<=8;step++){await pages[0].keyboard.press('ArrowDown');const target=tracks[(3+step)%8];await expect(researchPanel.getByRole('radio',{name:new RegExp(target)})).toBeChecked();const action=await researchPanel.getByRole('button',{name:'Queue '+target,exact:true}).boundingBox();expect(action!.y).toBeGreaterThanOrEqual(0);expect(action!.y+action!.height).toBeLessThanOrEqual(height);}

  }
  await researchPanel.getByRole('button',{name:'Queue investing',exact:true}).click();
  await expect(researchPanel.getByText('Research order accepted. It will apply at its scheduled tick.',{exact:true})).toBeVisible();
  await expect(researchPanel.getByRole('region',{name:'Accepted research orders'})).toContainText('Tick 1 · investing');
  await pages[0].reload();await pages[0].getByRole('button',{name:'Economy',exact:true}).click();
  await expect(researchPanel.getByRole('radio',{name:/investing/})).toBeChecked();
  await expect(researchPanel.getByRole('region',{name:'Accepted research orders'})).toContainText('Tick 1 · investing');
  remaining=900000-Date.now()%900000+100;console.log(`Production journey: waiting ${Math.ceil(remaining/1000)}s for actual first production.`);await new Promise(r=>setTimeout(r,remaining));
  const tray=pages[0].getByRole('dialog',{name:'Empire economy panel'});await expect(tray.getByRole('status',{name:'Production schedule'})).toContainText('Awaiting next tick.');
  await deliver('runProduction');await deliver('runProduction');
  for(const page of pages){const panel=page.getByRole('dialog',{name:'Empire economy panel'});await expect(panel).toContainText('Confirmed tick 1');await expect(panel.locator('.balance strong')).toHaveText('202.8');await expect(panel.getByRole('progressbar',{name:'Science towards next level'})).toHaveAttribute('value','1400');}
  await expect(researchPanel.getByRole('status',{name:'Applied research order'})).toContainText('investing applied at tick 1.');
  for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const) {
   const page=pages[0];await page.setViewportSize({width,height});const back=tray.getByRole('button',{name:'Return to galaxy'});const box=await back.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(height);await geometry(page,tray);await tray.getByRole('region',{name:'Production ledger'}).evaluate(el=>el.scrollTo(0,0));
   const path=info.outputPath(`production-${label}.png`);await page.screenshot({path});await info.attach(`Production ${label}`,{path,contentType:'image/png'});
  }
  await pages[0].keyboard.press('Escape');await expect(pages[0].getByRole('button',{name:'Economy',exact:true})).toBeFocused();await pages[0].reload();await pages[0].getByRole('button',{name:'Economy',exact:true}).click();await expect(tray.locator('.balance strong')).toHaveText('202.8');await expect(tray).toContainText('Confirmed tick 1');
 }finally{for(const context of contexts)await context.close();}
});
