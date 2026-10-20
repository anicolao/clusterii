import {test,expect} from '@playwright/test';
import {login,grantDeveloper} from './helpers';
test('managed-key real campaign creates, joins, reloads and leaves through production UI',async({page},info)=>{
  test.skip(process.env.CLUSTER_KMS_TEST!=='true','Requires explicitly configured live Cloud KMS credentials; no KMS mock is used.');
  test.setTimeout(90000);
  const email=`real-campaign-${Date.now()}@example.test`;
  await login(page,email);await page.getByLabel('Commander name').fill('Cipher envoy');
  await page.getByRole('button',{name:'Save identity'}).click();await expect(page.getByRole('status')).toContainText('Identity saved');
  await grantDeveloper(email);await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('link',{name:'Open campaigns'}).click();
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();
  await page.getByLabel('Campaign name').fill(`Cipher dawn ${Date.now()}`);
  await page.getByRole('radio',{name:'Real encryption · managed keys'}).check();
  const settings=info.outputPath('real-encryption-create.png');await page.screenshot({path:settings});await info.attach('Real encryption selected',{path:settings,contentType:'image/png'});
  await page.getByRole('button',{name:'Create galaxy'}).click();await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();
  await page.getByRole('button',{name:'Claim your seat'}).click();await expect(page.getByText('Your seat is confirmed.')).toBeVisible();
  await page.reload();await expect(page.locator('canvas')).toBeVisible();
  const recovered=info.outputPath('real-encryption-recovered.png');await page.screenshot({path:recovered});await info.attach('Real campaign recovered through managed key delivery',{path:recovered,contentType:'image/png'});
  await page.getByRole('button',{name:'Roster',exact:true}).click();await page.getByRole('button',{name:'Leave campaign'}).click();await expect(page.getByText('Your seat has been released.')).toBeVisible();
});

test('unconfigured managed keys cannot silently create a mock campaign',async({page})=>{
  test.skip(process.env.CLUSTER_KMS_TEST==='true','This case verifies the explicitly unconfigured emulator.');
  const email=`unconfigured-encryption-${Date.now()}@example.test`;
  await login(page,email);await page.getByLabel('Commander name').fill('Development envoy');
  await page.getByRole('button',{name:'Save identity'}).click();await expect(page.getByRole('status')).toContainText('Identity saved');
  await grantDeveloper(email);await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('link',{name:'Open campaigns'}).click();
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();
  await expect(page.getByRole('radio',{name:'Real encryption · managed keys'})).toBeDisabled();
  await expect(page.getByRole('radio',{name:'Mock codec · inspectable data'})).toBeChecked();
});
