import {test,expect} from '@playwright/test';
import {login,grantDeveloper,geometry} from './helpers';
for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const)test(`encrypted campaign history recovery: ${label}`,async({page,context},info)=>{
 test.setTimeout(90000);
 await page.setViewportSize({width,height});const email=`history-${label}-${Date.now()}@example.test`;
 await login(page,email);await page.getByLabel('Commander name').fill('History envoy');await page.getByRole('button',{name:'Save identity'}).click();await expect(page.getByRole('status')).toContainText('Identity saved');
 await grantDeveloper(email);await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('link',{name:'Open campaigns'}).click();await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.getByLabel('Campaign name').fill(`History ${label} ${Date.now()}`);await page.getByRole('button',{name:'Create galaxy'}).click();await page.getByRole('button',{name:'Claim your seat'}).click();await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
 const url=page.url();
 await page.getByRole('button',{name:'Roster',exact:true}).click();await page.getByText('Development controls',{exact:true}).click();
 for(let i=0;i<12;i++) {
  const pause=i%2===0;await page.getByRole('button',{name:pause?'Pause campaign':'Resume campaign',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:pause?/^Campaign paused\./:/^Campaign resumed\./})).toHaveText(pause?'Campaign paused. Admissions and scheduled start are stopped.':'Campaign resumed.');
 }
 await page.getByRole('button',{name:'Close roster'}).click();
 const selected=await page.getByRole('complementary',{name:'Selected system'}).getByRole('heading').textContent();
 await page.getByRole('button',{name:'History',exact:true}).click();
 const tray=page.getByRole('dialog',{name:'Campaign history panel'});
 await expect(tray.locator('summary')).toHaveCount(10);
 const back=tray.getByRole('button',{name:'Return to galaxy'});
 // The briefing entry precedes the bounded records. Verify both directions
 // and the modal wrap, rather than assuming records are the first control.
 const briefing=tray.getByRole('button',{name:'Since your last visit',exact:true});
 const records=tray.getByRole('region',{name:'Saved campaign records'});
 await records.focus();await page.keyboard.press('Shift+Tab');await expect(briefing).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(back).toBeFocused();
 await page.keyboard.press('Tab');await expect(briefing).toBeFocused();
 await page.keyboard.press('Tab');await expect(records).toBeFocused();
 const rail=await back.boundingBox();expect(rail!.y+rail!.height).toBeLessThanOrEqual(height);expect(rail!.y).toBeGreaterThan(0);
 await tray.getByRole('group',{name:'Campaign record 14',exact:true}).locator('summary').click();
 await expect(tray.getByRole('group',{name:'Campaign record 14',exact:true}).getByText('History envoy',{exact:true})).toBeVisible();
 await tray.getByRole('button',{name:'Earlier records'}).click();await expect(tray.locator('summary')).toHaveCount(13);
 await expect(tray.getByText('Beginning of your available history.')).toBeVisible();
 const scroll=tray.getByRole('region',{name:'Saved campaign records'});
 const position=await scroll.evaluate(el=>el.scrollTop);
 const second=await context.newPage();await second.goto(url);await second.getByRole('button',{name:'Roster',exact:true}).click();await second.getByText('Development controls',{exact:true}).click();await second.getByRole('button',{name:'Pause campaign',exact:true}).click();await expect(second.getByRole('status').filter({hasText:/^Campaign paused\./})).toBeVisible();
 await expect(tray.getByRole('button',{name:'New records available'})).toBeAttached();
 expect(await scroll.evaluate(el=>el.scrollTop)).toBe(position);await expect(tray.locator('summary')).toHaveCount(13);
 await tray.getByRole('button',{name:'Latest records'}).click();await expect(tray.getByRole('group',{name:'Campaign record 15',exact:true}).locator('summary')).toContainText('Record 15');
 await geometry(page,tray);
 await scroll.evaluate(el=>el.scrollTo(0,0));
 const capture=info.outputPath(`history-${label}.png`);await page.screenshot({path:capture});await info.attach(`History ${label}`,{path:capture,contentType:'image/png'});
 if(label==='phone') {
   await context.setOffline(true);await tray.getByRole('button',{name:'Latest records'}).click();await expect(tray.getByRole('alert')).toContainText('History could not be recovered');await expect(tray.locator('summary')).toHaveCount(10);
   await page.screenshot({path:info.outputPath('history-offline-phone.png')});
   await context.setOffline(false);await tray.getByRole('button',{name:'Retry history'}).click();await expect(tray.getByRole('alert')).toHaveCount(0);await expect(tray.getByRole('button',{name:'Latest records'})).toBeEnabled();
 }
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'History',exact:true})).toBeFocused();expect(await page.getByRole('complementary',{name:'Selected system'}).getByRole('heading').textContent()).toBe(selected);
 await page.reload();await page.getByRole('button',{name:'History',exact:true}).click();await expect(tray.getByRole('group',{name:'Campaign record 15',exact:true}).locator('summary')).toContainText('Record 15');
 await back.click();await second.close();
});
