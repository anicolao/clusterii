import {test,expect} from '@playwright/test';

test('construction instrument preserves outcomes and commitment at four sizes',async({page},info)=>{
 await page.goto('dev/animations/');await page.getByLabel('Scenario',{exact:true}).selectOption('construction');const sample=page.getByRole('region',{name:'Standard motion comparison'});const reduced=page.getByRole('region',{name:'Reduced motion comparison'});const seek=page.getByLabel(/Inspect frame/);
 await seek.fill('0');await expect(sample.getByRole('button',{name:'Awaiting acknowledgement…'})).toBeDisabled();
 await seek.fill('1100');await expect(sample.getByRole('alert')).toHaveText((await reduced.getByRole('alert').textContent())!);
 await seek.fill('2400');await expect(sample).toContainText('Construction order accepted.');await expect(sample).toContainText('Queued · eligible tick 1');
 await seek.fill('3400');await expect(sample).toContainText('Market · completed');await expect(reduced).toContainText('Market · completed');
 for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const){
  await page.setViewportSize({width,height});await sample.scrollIntoViewIfNeeded();const instrument=sample.getByRole('region',{name:'System construction',exact:true});
  for(const control of await instrument.locator('button,input[type=radio]').all()){await control.scrollIntoViewIfNeeded();const box=await control.boundingBox(),bounds=await instrument.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);expect(box!.x+box!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width+1);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);const path=info.outputPath(`construction-lab-${label}.png`);await sample.screenshot({path});await info.attach(label,{path,contentType:'image/png'});
 }
});
