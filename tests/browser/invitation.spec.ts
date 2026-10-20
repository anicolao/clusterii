import {test, expect} from '@playwright/test';
import {login, grantDeveloper} from './helpers';
test('signed-out invitation preserves its campaign through Google sign-in and saved identity',async({browser,page},info)=>{
  const owner=`invite-owner-${Date.now()}@example.test`;
  await login(page,owner);
  await page.getByLabel('Commander name').fill('Invitation host');
  await page.getByRole('button',{name:'Save identity'}).click();
  await expect(page.getByRole('status')).toContainText('Identity saved');
  await grantDeveloper(owner);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('link',{name:'Open campaigns'}).click();
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();
  const name=`Invitation ${Date.now()}`;
  await page.getByLabel('Campaign name').fill(name);
  await page.getByRole('button',{name:'Create galaxy'}).click();
  await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();
  const invitation=page.url();
  const other=await browser.newContext({viewport:{width:393,height:852}});
  try {
    const guest=await other.newPage();
    await guest.goto(invitation);
    await guest.getByRole('link',{name:'Sign in to continue'}).click();
    await expect(guest.getByRole('button',{name:'Play',exact:true})).toBeVisible();
    const id=new URL(invitation).searchParams.get('campaign');
    expect(new URL(guest.url()).searchParams.get('campaign')).toBe(id);
    const email=`invited-${Date.now()}@example.test`;
    await login(guest,email,guest.url());
    await grantDeveloper(email);
    await guest.getByLabel('Commander name').fill('Invited envoy');
    await guest.getByRole('button',{name:'Save identity'}).click();
    await expect(guest).toHaveURL(invitation);
    await expect(guest.getByRole('heading',{name:'Choose your faction'})).toBeVisible();
    await guest.getByRole('button',{name:'Claim your seat'}).click();
    await expect(guest.getByText('Your seat is confirmed.')).toBeVisible();
    const path=info.outputPath('invited-seat-phone.png');await guest.screenshot({path});await info.attach('Invited commander seat confirmed',{path,contentType:'image/png'});
    await guest.reload();
    await expect(guest.locator('canvas')).toBeVisible();
  }finally{await other.close();}
});
