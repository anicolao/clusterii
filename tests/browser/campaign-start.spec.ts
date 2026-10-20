import { test, expect } from '@playwright/test';
import { login, grantDeveloper } from './helpers';

test('four independent commanders fill a roster and receive distinct homes at the scheduled boundary', async ({browser,request},info) => {
  test.setTimeout(17*60*1000);
  const contexts=[];
  const pages=[];
  const name=`Shared dawn ${Date.now()}`;
  const factions=['Heliac Assembly','Pelagic Concord','Vesper Synod','Dracon League'];
  try {
    for(let index=0;index<4;index++) {
      const context=await browser.newContext();contexts.push(context);
      const page=await context.newPage();pages.push(page);
      const email=`scheduled-${index}-${Date.now()}@example.test`;
      await login(page,email);
      await page.getByLabel('Commander name').fill(`Dawn envoy ${index+1}`);
      await page.getByRole('button',{name:'Save identity'}).click();
      await expect(page.getByRole('status')).toContainText('Identity saved');
      await grantDeveloper(email);
      await page.getByRole('button',{name:'Close',exact:true}).click();
      await page.getByRole('link',{name:'Open campaigns'}).click();
      if(index===0){
        await page.getByRole('button',{name:'Create campaign',exact:true}).click();
        await page.getByLabel('Campaign name').fill(name);
        await page.getByRole('button',{name:'Create galaxy'}).click();
      }else {
        await page.getByRole('button',{name:'Joinable campaigns',exact:true}).click();
        await page.getByRole('button',{name:new RegExp(name)}).click();
      }
      await page.getByRole('radio',{name:new RegExp(factions[index])}).check();
      await page.getByRole('button',{name:'Claim your seat'}).click();
      await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
    }
    for(const page of pages){
      await page.getByRole('button',{name:'Roster',exact:true}).click();
      await expect(page.getByRole('heading',{name:'4 / 4 empires assembled'})).toBeVisible();
      await expect(page.getByRole('region',{name:'Campaign roster',exact:true})).toContainText('The server assigns home systems at the scheduled start.');
    }
    const scheduledCapture=info.outputPath('four-player-scheduled.png');
    await pages[0].screenshot({path:scheduledCapture});await info.attach('Four-player scheduled roster',{path:scheduledCapture,contentType:'image/png'});
    // Emulators do not run Cloud Scheduler. Deliver its actual HTTP event at
    // the real UTC boundary: no campaign state writes or internal start calls.
    const remaining=900000-(Date.now()%900000)+100;
    console.log(`Waiting ${Math.ceil(remaining/1000)} seconds for the real campaign boundary.`);
    await new Promise(resolve=>setTimeout(resolve,remaining));
    const response=await request.post('http://127.0.0.1:15001/demo-clusterii/us-central1/startScheduledCampaigns-0',{headers:{'X-CloudScheduler-JobName':'emulator-browser-clock','X-CloudScheduler-ScheduleTime':new Date().toISOString()}});
    expect(response.ok()).toBe(true);
    const homes=[];
    for(const page of pages){
      await expect(page.getByText('Campaign begun',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Close roster'}).click();
      const inspector=page.getByRole('complementary',{name:'Selected system'});
      await expect(inspector.getByText('You',{exact:true})).toHaveCount(2);
      await expect(inspector.getByText('20',{exact:true})).toHaveCount(2);
      homes.push(await inspector.getByRole('heading').innerText());
    }
    expect(new Set(homes).size).toBe(4);
    const path=info.outputPath('four-player-home-assigned.png');await pages[0].screenshot({path});await info.attach('Authoritative home assigned',{path,contentType:'image/png'});
  } finally {for(const context of contexts)await context.close();}
});
