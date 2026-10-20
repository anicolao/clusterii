import { expect, test } from '@playwright/test';
import { login, geometry } from './helpers';
async function grantDeveloper(email: string) {
  const list = await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:batchGet',{headers:{Authorization:'Bearer owner'}});
  const data = await list.json() as {users:{localId:string,email:string}[]};
  const uid = data.users.find(u=>u.email===email)!.localId;
  const result=await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:update',{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({localId:uid,customAttributes:JSON.stringify({developer:true})})});
  expect(result.ok).toBe(true);
}
for (const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['4k',3840,2160],['short',1280,720]] as const) {
  test(`campaign create, join, select and recover: ${label}`,async({page},info)=>{
    await page.setViewportSize({width,height});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const email=`campaign-${label}-${Date.now()}@example.test`;
    await login(page,email);
    await page.getByLabel('Commander name').fill('Star envoy');
    await page.getByRole('button',{name:'Save identity'}).click();
    await expect(page.getByText('Identity saved.',{exact:false})).toBeVisible();
    await grantDeveloper(email);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('link',{name:'Open campaigns'}).click();
    await page.getByRole('button',{name:'Create campaign',exact:true}).click();
    await page.getByLabel('Campaign name').fill(`Review ${label}`);
    await geometry(page);
    await page.getByRole('button',{name:'Create galaxy',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();
    await expect(page.getByText('Campaign created. Choose your faction.')).toBeVisible();
    await geometry(page);
    await page.locator('.campaign-body').evaluate(el=>el.scrollTop=0);
    const factionPath=info.outputPath(`factions-${label}.png`);
    await page.screenshot({path:factionPath});await info.attach(`factions-${label}`,{path:factionPath,contentType:'image/png'});
    await page.getByRole('button',{name:'Claim your seat'}).click();
    await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await page.getByRole('button',{name:'Systems list',exact:true}).click();
    const item=page.getByRole('button',{name:/Select .* class/}).nth(5);
    const accessible=await item.getAttribute('aria-label');
    await item.click();
    await expect(page.getByRole('complementary',{name:'Selected system'})).toContainText(accessible!.split(',')[0].replace('Select ',''));
    await geometry(page);
    await page.locator('.campaign-body').evaluate(el=>el.scrollTop=0);
    const galaxyPath=info.outputPath(`galaxy-${label}.png`);
    await page.screenshot({path:galaxyPath});await info.attach(`galaxy-${label}`,{path:galaxyPath,contentType:'image/png'});
    await page.reload();
    await page.getByRole('button',{name:new RegExp(`Review ${label}`)}).click();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('button',{name:'Leave campaign'})).toBeVisible();
    await page.getByRole('button',{name:'Leave campaign'}).click();
    await expect(page.getByText('Your seat has been released.')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
