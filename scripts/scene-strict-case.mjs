export const cases = Object.freeze({"briefing": {"file": "tests/browser/return-briefing.story.spec.ts", "title": "Live return briefing recovers authorized activity and saves only the reviewed private period", "story": "live-return-briefing", "sha": "5ed55233aeb9259683a8e05fd15833d12f63c13660985bd63cc62beeb5314c99", "views": 27}, "session": {"file": "tests/browser/session-recovery.story.spec.ts", "title": "Two devices recover an interrupted sign-out without losing saved identity", "story": "session-interrupted-recovery", "sha": "6576459cd3651dda5c86b2b78aaf653a2b6cb73a9f2f3b2301a5d858d293fca1", "views": 15}});
export const viewports=['short'];
export function selection(args){
 if(args.length!==2||!Object.hasOwn(cases,args[0])||!viewports.includes(args[1]))throw Error('Exactly one allowlisted family and viewport required');
 const c=cases[args[0]],title='(?:^|\\s)'+c.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
 return {...c,family:args[0],viewport:args[1],args:['x','playwright','test','--config','playwright.stories.config.ts',c.file,'--grep',title,'--project='+args[1],'--retries=0','--max-failures=1','--update-snapshots=none']};
}
export function assertListing(output,c){
 const tests=output.split('\n').filter(l=>/^\s*\[(phone|desktop|large|short)\]/.test(l));
 if(!output.includes('Total: 1 test in 1 file')||tests.length!==1||!tests[0].includes('['+c.viewport+']')||!tests[0].endsWith(' › '+c.title)||!tests[0].includes(c.file.split('/').at(-1)+':'))throw Error('Collection must select exactly the bound story and viewport');
}
