export const cases = Object.freeze({"travel": {"file": "tests/e2e/008-fleet-travel/fleet-travel.spec.ts", "title": "Live fleet travel and arrival preserve private forces through recovery", "story": "live-fleet-travel", "sha": "33f1389a8263356efb93b55aa6f73cf45b056832faf9d95584214c49aa3f6290", "views": 40}});
export const viewports=['phone','desktop','large','short'];
export function selection(args){
 if(args.length!==2||!Object.hasOwn(cases,args[0])||!viewports.includes(args[1]))throw Error('Exactly one allowlisted family and viewport required');
 const c=cases[args[0]],title='(?:^|\\s)'+c.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
 return {...c,family:args[0],viewport:args[1],args:['x','playwright','test','--config','playwright.stories.config.ts',c.file,'--grep',title,'--project='+args[1],'--retries=0','--max-failures=1','--update-snapshots=none']};
}
export function assertListing(output,c){
 const tests=output.split('\n').filter(l=>/^\s*\[(phone|desktop|large|short)\]/.test(l));
 if(!output.includes('Total: 1 test in 1 file')||tests.length!==1||!tests[0].includes('['+c.viewport+']')||!tests[0].endsWith(' › '+c.title)||!tests[0].includes(c.file.split('/').at(-1)+':'))throw Error('Collection must select exactly the bound story and viewport');
}
