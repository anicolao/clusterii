import {test,expect} from '@playwright/test';
import {login,authenticate,grantDeveloper,geometry} from './helpers';
for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const)test(`live encryption migration and connected-device recovery: ${label}`,async({page,browser},info)=>{
 test.skip(process.env.CLUSTER_KMS_TEST!=='true','Requires actual managed key service; migration has no KMS fallback.');test.setTimeout(120000);
 await page.setViewportSize({width,height});const email=`migration-${label}-${Date.now()}@example.test`;
 await login(page,email);await page.getByLabel('Commander name').fill('Epoch envoy');await page.getByRole('button',{name:'Save identity'}).click();await expect(page.getByRole('status')).toContainText('Identity saved');await grantDeveloper(email);await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('link',{name:'Open campaigns'}).click();await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.getByLabel('Campaign name').fill(`Epoch journey ${label} ${Date.now()}`);await page.getByRole('button',{name:'Create galaxy'}).click();await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();await page.getByRole('button',{name:'Claim your seat'}).click();await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
 const companion=await browser.newContext({viewport:{width,height}});
 try {
  const other=await companion.newPage();await other.goto(page.url());await other.getByRole('link',{name:'Sign in to continue'}).click();await authenticate(other,email);await expect(other.locator('canvas')).toBeVisible();
  await other.getByRole('button',{name:'Roster',exact:true}).click();await other.getByText('Development controls',{exact:true}).click();
  for(const [mode,radio] of [['real','Real · managed keys'],['mock','Mock · inspectable']] as const){
   await page.getByRole('button',{name:'Roster',exact:true}).click();await page.getByText('Development controls',{exact:true}).click();await page.getByRole('button',{name:'Pause campaign',exact:true}).click();await expect(page.getByText('Campaign paused. Admissions and scheduled start are stopped.',{exact:true})).toBeVisible();
   await page.getByRole('radio',{name:radio,exact:true}).check();await geometry(page,page.getByRole('dialog',{name:'Campaign roster panel'}));
   await page.getByRole('button',{name:'Change encryption and resume'}).click();await expect(page.getByText(/^Changing encryption:/)).toBeFocused();
   const progress=info.outputPath(`migration-${mode}-${label}.png`);await page.screenshot({path:progress});await info.attach(`Migration ${mode} ${label}`,{path:progress,contentType:'image/png'});
   await expect(page.getByText('Encryption changed and verified. Campaign resumed.',{exact:true})).toBeVisible({timeout:60000});await expect(page.locator('#galaxy-heading')).toBeFocused();await expect(page.getByRole('alert')).toHaveCount(0);
   await expect(other.getByRole('radio',{name:radio,exact:true})).toBeChecked();await expect(other.getByRole('button',{name:'Pause campaign',exact:true})).toBeEnabled();await expect(other.getByRole('alert')).toHaveCount(0);
   await page.reload();await expect(page.locator('canvas')).toBeVisible();
  }
  await page.getByRole('button',{name:'Roster',exact:true}).click();await page.getByText('Development controls',{exact:true}).click();await expect(page.getByText(/This game has exposed mock data/)).toBeVisible();
  const final=info.outputPath(`migration-recovered-${label}.png`);await page.getByRole('button',{name:'Change encryption and resume'}).scrollIntoViewIfNeeded();await page.screenshot({path:final});await info.attach(`Recovered ${label}`,{path:final,contentType:'image/png'});
 }finally{await companion.close();}
});
