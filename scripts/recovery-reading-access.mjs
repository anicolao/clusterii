// Component-only keyboard reading probe; no game mutation or live-family generation.
import { chromium,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { rendererArgs } from '../playwright.stories.config.ts';
import { expectReadingTarget } from '../tests/browser/story-helpers/reading-target.ts';
const output=process.argv[2];if(!output)throw Error('Explicit retained output required');
const browser=await chromium.launch({args:rendererArgs});
const timer=setTimeout(()=>void browser.close(),30000);timer.unref();
const result={scope:'gallery component keyboard access, not live accepted state',cases:[]};
try{
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark',reducedMotion:'reduce'});page.setDefaultTimeout(10000);
 await page.goto('http://127.0.0.1:4173/clusterii/pr4/gallery/');await page.evaluate(()=>document.fonts.ready);
 // The source's fixed first fleet specimen is ready; no ambiguity about live selection.
 const fleet=page.locator('section').filter({has:page.getByRole('heading',{name:'Stationed fleets · shared manifest and icon',exact:true})}).locator('.fleet-instrument').nth(0);
 const manifest=fleet.getByRole('region',{name:'Fleet manifest and orders',exact:true});
 await manifest.scrollIntoViewIfNeeded();await manifest.focus();await manifest.press('End');await manifest.press('Home');
 const newFleet=fleet.getByRole('button',{name:'New fleet',exact:true});await expectReadingTarget(newFleet);await expect(manifest).toBeFocused();
 result.cases.push({name:'Fleet manifest Home',passed:true,scrollTop:await manifest.evaluate(e=>e.scrollTop)});
 const research=page.getByRole('region',{name:'Research specimen ready',exact:true});
 const summary=research.locator('details.forecast > summary');await summary.focus();await summary.press('Enter');
 const reading=research.getByRole('region',{name:'Research forecast details',exact:true});await reading.focus();await reading.press('End');
 const paragraph=reading.locator('p').filter({hasText:/^Active research:/});await expectReadingTarget(paragraph,false);await expect(reading).toBeFocused();
 result.cases.push({name:'Forecast End',passed:true,scrollTop:await reading.evaluate(e=>e.scrollTop)});
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');
}catch(e){writeFileSync(output,JSON.stringify({...result,error:String(e)},null,2)+'\n');throw e;}finally{clearTimeout(timer);await browser.close();}
