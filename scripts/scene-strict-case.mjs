export const cases = Object.freeze({
  chart: {file:'tests/browser/campaign-navigation.story.spec.ts',title:'A waiting commander filters stars, orbits by keyboard and inspects a clipped map label',story:'campaign-chart-navigation',sha:'f314919f15fcf692c79c3885bfef3063f5cfee66192f3c0501419c32e6cde975'},
  route: {file:'tests/browser/fleet-route-recovery.story.spec.ts',title:'Interrupted route commands retain their original choices and identity',story:'interrupted-fleet-route',sha:'1ecc3a5cbc05c563a67619a6742ea970266b7ad0a697b7911e0ed1a805c644e8'},
});
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
