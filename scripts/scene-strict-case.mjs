export const cases = Object.freeze({"observation": {"file": "tests/browser/observations.story.spec.ts", "title": "Live stellar observations retain private current and historical facts after reload", "story": "live-stellar-observations", "sha": "5c543b34e907850b9ae515acb9097c8466aefc4adb3dfe7816734dc6b419b304", "views": 18}, "chart": {"file": "tests/browser/campaign-navigation.story.spec.ts", "title": "A waiting commander filters stars, orbits by keyboard and inspects a clipped map label", "story": "campaign-chart-navigation", "sha": "577720bd59241b1e0d9e62f8737c686f70fdbef28a1f40697932bc921e77e788", "views": {"phone": 8, "desktop": 7, "large": 7, "short": 7}}});
export const viewports=['phone','desktop','large','short'];
export function selection(args){
 if(args.length!==2||!Object.hasOwn(cases,args[0])||!viewports.includes(args[1]))throw Error('Exactly one allowlisted family and viewport required');
 const c=cases[args[0]],title='(?:^|\\s)'+c.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
 return {...c,views:typeof c.views==='number'?c.views:c.views[args[1]],family:args[0],viewport:args[1],args:['x','playwright','test','--config','playwright.stories.config.ts',c.file,'--grep',title,'--project='+args[1],'--retries=0','--max-failures=1','--update-snapshots=none']};
}
export function assertListing(output,c){
 const tests=output.split('\n').filter(l=>/^\s*\[(phone|desktop|large|short)\]/.test(l));
 if(!output.includes('Total: 1 test in 1 file')||tests.length!==1||!tests[0].includes('['+c.viewport+']')||!tests[0].endsWith(' › '+c.title)||!tests[0].includes(c.file.split('/').at(-1)+':'))throw Error('Collection must select exactly the bound story and viewport');
}
