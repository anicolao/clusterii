export const cases = Object.freeze({"start": {"file": "tests/browser/campaign-start.story.spec.ts", "title": "Five commanders start two campaigns and recover their named active campaign", "story": "campaign-scheduled-start", "sha": "63937b4dd502a2e10bcb4a8662149370101627cb5c04a5edcefa2a4802b45044", "views": 50}, "ordinary": {"file": "tests/browser/credit-exchange.story.spec.ts", "title": "Live credit exchange settles and withdraws exact terms", "story": "credit-exchange-ordinary", "sha": "033937437c2e14f5d8650a378d05c606f6d0e1d4d799f0ced4a43cb30f159a14", "views": 28}, "recovery": {"file": "tests/browser/credit-exchange.story.spec.ts", "title": "Live credit exchange recovers an interrupted offer", "story": "credit-exchange-recovery", "sha": "033937437c2e14f5d8650a378d05c606f6d0e1d4d799f0ced4a43cb30f159a14", "views": 25}, "history": {"file": "tests/browser/selected-history.story.spec.ts", "title": "Selected history reaches only a consenting commander and survives reload", "story": "selected-history-consent", "sha": "02f5c7efe2e3f8eda5e280d2433577c01f3c825f749d088564a9ed53ea0ee959", "views": 15}});
export const viewports=['phone'];
export function selection(args){
 if(args.length!==2||!Object.hasOwn(cases,args[0])||!viewports.includes(args[1]))throw Error('Exactly one allowlisted family and viewport required');
 const c=cases[args[0]],title='(?:^|\\s)'+c.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
 return {...c,family:args[0],viewport:args[1],args:['x','playwright','test','--config','playwright.stories.config.ts',c.file,'--grep',title,'--project='+args[1],'--retries=0','--max-failures=1','--update-snapshots=none']};
}
export function assertListing(output,c){
 const tests=output.split('\n').filter(l=>/^\s*\[(phone|desktop|large|short)\]/.test(l));
 if(!output.includes('Total: 1 test in 1 file')||tests.length!==1||!tests[0].includes('['+c.viewport+']')||!tests[0].endsWith(' › '+c.title)||!tests[0].includes(c.file.split('/').at(-1)+':'))throw Error('Collection must select exactly the bound story and viewport');
}
