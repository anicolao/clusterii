import {readFileSync, existsSync} from 'node:fs';
import {resolve, join, dirname, isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
export function checkContactReferences(root, approval, inventory) {
  const prefix='/tmp/cluster-pr69-linux-candidates/test-results/stories/';
  const expected=new Map();
  if(inventory.length!==4)throw Error('Four original viewport manifests required');
  for(const record of inventory){
    const viewport=record.outcome.viewport;
    if(!['phone','desktop','large','short'].includes(viewport)||record.images.length!==19)throw Error('Complete original contact family required');
    for(const image of record.images){
      if(!image.path.startsWith(prefix+'live-fleet-contacts/'+viewport+'/linux-arm64/')||expected.has(image.path))throw Error('Invalid or duplicate original path');
      expected.set(image.path,{...image,renderer:record.renderer});
    }
  }
  if(approval.status!=='approved-for-regression-baseline-import'||approval.images.length!==76||expected.size!==76)throw Error('Exact independently approved76 images required');
  const seen=new Set();
  for(const image of approval.images){
    const original=expected.get(image.path),relative=image.path.slice(prefix.length);
    if(!original||original.sha256!==image.sha256||seen.has(image.path)||isAbsolute(relative)||relative.split('/').includes('..'))throw Error('Approval/original inventory mismatch');
    seen.add(image.path);
    const png=join(root,'tests/browser/story-baselines',relative),folder=dirname(png);
    for(const file of [png,join(folder,'renderer.json'),join(folder,'review.json')])if(!existsSync(file))throw Error('Missing required reference file: '+file);
    if(createHash('sha256').update(readFileSync(png)).digest('hex')!==image.sha256)throw Error('Approved PNG hash differs: '+relative);
    const renderer=JSON.parse(readFileSync(join(folder,'renderer.json'),'utf8')),review=JSON.parse(readFileSync(join(folder,'review.json'),'utf8'));
    if(!isDeepStrictEqual(renderer,original.renderer)||!isDeepStrictEqual(review.renderer,original.renderer))throw Error('Original renderer metadata differs: '+relative);
  }
  return {images:seen.size,viewports:inventory.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=process.cwd(),folder=join(root,'docs/testing/pr69-parent-preparation/candidates-complete');
 console.log(JSON.stringify(checkContactReferences(root,JSON.parse(readFileSync(join(folder,'reviewer-approval.json'),'utf8')),JSON.parse(readFileSync(join(folder,'verified-inventory.json'),'utf8')))));
}
