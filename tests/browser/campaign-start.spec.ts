import { test, expect } from '@playwright/test';
import { login, grantDeveloper, geometry } from './helpers';

test('independent commanders start two campaigns and resume the last accessible active campaign', async ({browser,request},info) => {
  test.setTimeout(18*60*1000);
  const contexts=[];
  const pages=[];
  const names=[`Shared dawn ${Date.now()}`,`Second dawn ${Date.now()}`];
  const urls:string[]=[];
  const factions=['Heliac Assembly','Pelagic Concord','Vesper Synod','Dracon League'];
  try {
    for(let index=0;index<5;index++) {
      const context=await browser.newContext();contexts.push(context);
      const page=await context.newPage();pages.push(page);
      const email=`scheduled-${index}-${Date.now()}@example.test`;
      await login(page,email);
      await page.getByLabel('Commander name').fill(`Dawn envoy ${index+1}`);
      await page.getByRole('button',{name:'Save identity'}).click();
      await expect(page.getByRole('status')).toContainText('Identity saved');
      await grantDeveloper(email);
      await page.getByRole('button',{name:'Close',exact:true}).click();
      await expect(page.getByRole('button',{name:/^Continue/})).toHaveCount(0);
      await page.getByRole('button',{name:'Play',exact:true}).click();
    }
    for(let campaign=0;campaign<2;campaign++) {
      const roster=campaign===0?[0,1,2,3]:[0,1,2,4];
      for(let seat=0;seat<4;seat++) {
        const page=pages[roster[seat]];
        if(seat===0){
          if(campaign>0)await page.getByRole('button',{name:'Campaigns',exact:true}).click();
          await page.getByRole('button',{name:'Create campaign',exact:true}).click();
          await page.getByLabel('Campaign name').fill(names[campaign]);
          await page.getByRole('button',{name:'Create galaxy'}).click();
          await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();
          urls.push(page.url());
        }else await page.goto(urls[campaign]);
        await page.getByRole('radio',{name:new RegExp(factions[seat])}).check();
        await page.getByRole('button',{name:'Claim your seat'}).click();
        await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
      }
    }
    for(const page of pages){
      await page.getByRole('button',{name:'Roster',exact:true}).click();
      await expect(page.getByRole('heading',{name:'4 / 4 empires assembled'})).toBeVisible();
      await expect(page.getByRole('region',{name:'Campaign roster',exact:true})).toContainText('The server assigns home systems at the scheduled start.');
    }
    const scheduledCapture=info.outputPath('four-player-scheduled.png');
    await pages[0].screenshot({path:scheduledCapture});await info.attach('Four-player scheduled roster',{path:scheduledCapture,contentType:'image/png'});
    // Real UTC boundary and actual scheduler endpoint; no injected campaign state or fake clock.
    const remaining=900000-(Date.now()%900000)+100;
    console.log(`Waiting ${Math.ceil(remaining/1000)} seconds for the real campaign boundary.`);
    await new Promise(resolve=>setTimeout(resolve,remaining));
    const response=await request.post('http://127.0.0.1:15001/demo-clusterii/us-central1/startScheduledCampaigns-0',{headers:{'X-CloudScheduler-JobName':'emulator-browser-clock','X-CloudScheduler-ScheduleTime':new Date().toISOString()}});
    expect(response.ok()).toBe(true);
    const homes=[];
    for(let index=0;index<4;index++){
      const page=pages[index];
      await page.goto(urls[0]);
      await expect(page.getByText('Campaign begun',{exact:true})).toBeVisible();
      const inspector=page.getByRole('complementary',{name:'Selected system'});
      await expect(inspector.getByText('You',{exact:true})).toHaveCount(2);
      await expect(inspector.getByText('20',{exact:true})).toHaveCount(2);
      homes.push(await inspector.getByRole('heading').innerText());
    }
    expect(new Set(homes).size).toBe(4);
    const homePath=info.outputPath('four-player-home-assigned.png');await pages[0].screenshot({path:homePath});await info.attach('Authoritative home assigned',{path:homePath,contentType:'image/png'});
    await pages[3].goto('./');
    await expect(pages[3].getByRole('button',{name:`Continue ${names[0]}`,exact:true})).toBeVisible();
    await expect(pages[3].getByRole('button',{name:'Play',exact:true})).toBeVisible();
    await expect(pages[3].getByRole('link',{name:'Change campaign'})).toHaveCount(0);
    const page=pages[0];
    await page.goto(urls[1]);
    await expect(page.getByText('Campaign begun',{exact:true})).toBeVisible();
    await page.goto('./');
    for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['4k',3840,2160],['short',1280,720]] as const){
      await page.setViewportSize({width,height});
      await page.reload();
      const resume=page.getByRole('button',{name:`Continue ${names[1]}`,exact:true});
      await expect(resume).toBeVisible();
      await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'Learn the game',exact:true})).toBeVisible();
      await expect(page.getByRole('link',{name:'Change campaign'})).toBeVisible();
      await geometry(page);
      const path=info.outputPath(`active-entry-${label}.png`);await page.screenshot({path});await info.attach(`active-entry-${label}`,{path,contentType:'image/png'});
    }
    await page.getByRole('button',{name:`Continue ${names[1]}`,exact:true}).click();
    await expect(page).toHaveURL(urls[1]);
    await expect(page.locator('canvas')).toBeVisible();
  } finally {for(const context of contexts)await context.close();}
});
