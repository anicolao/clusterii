import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const repo='/private/tmp/cluster-pr54-credit-review',require=createRequire(repo+'/package.json'),sharp=require('sharp');
const root='/tmp/cluster-pr63-maintenance-candidates-linux',folder=root+'/originals/test-results/stories/maintenance-admission-recovery/short/linux-arm64',out=root+'/comparisons';mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const target='cd0d5d60604b6f9c82665f03bc8621208559113f',active='f8adb007866692870ea2979e2d4108b2bb4bed3b',executor='9bf1b1f76eab7af2331ea7398999c21042ea70d0';
const git=(...args)=>execFileSync('git',args,{cwd:repo,maxBuffer:64*1024*1024});
const manifest=JSON.parse(readFileSync(folder+'/story.json'));
if(manifest.status!=='passed'||manifest.mode!=='generate'||manifest.source.commit!==executor||manifest.source.specSha256!=='825e5effebcb5a6b820786c7788c6f81d136b1ffd1f4f6a3c715d5e95334aac5'||manifest.renderer.environment!=='mcr.microsoft.com/playwright:v1.61.1-noble@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321')throw Error('manifest identity/status mismatch');
const names=manifest.steps.flatMap(s=>s.views.map(v=>v.image));if(names.length!==13||new Set(names).size!==13||readdirSync(folder).filter(n=>n.endsWith('.png')).length!==13)throw Error('Expected thirteen complete captures');
if(git('diff','--name-only',target,executor,'--','src','tests','functions','shared','package.json','bun.lock','playwright.stories.config.ts').toString().trim())throw Error('Source/spec/dependency differs');
const rows=[];
for(const name of names){const actual=readFileSync(folder+'/'+name),path='tests/browser/story-baselines/maintenance-admission-recovery/short/linux-arm64/'+name,expected=git('show',target+':'+path),old=git('show',active+':'+path);const row={name,actual:folder+'/'+name,actualSha256:sha(actual),targetSha256:sha(expected),activeSha256:sha(old),matchesTarget:actual.equals(expected),matchesActive:actual.equals(old)};
if(!actual.equals(old)){
const stem=name.replace('.png','');row.expected=out+'/'+stem+'-expected.png';row.diff=out+'/'+stem+'-diff.png';writeFileSync(row.expected,old);
const a=await sharp(actual).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(old).ensureAlpha().raw().toBuffer({resolveWithObject:true});if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('dimension mismatch');const bytes=Buffer.alloc(a.data.length);let count=0,minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
for(let i=0;i<a.data.length;i+=4){const changed=!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4));if(changed){count++;const x=(i/4)%a.info.width,y=Math.floor(i/4/a.info.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);bytes[i]=255;bytes[i+1]=0;bytes[i+2]=0;}else{for(let c=0;c<3;c++)bytes[i+c]=Math.round(b.data[i+c]*.25+255*.75);}bytes[i+3]=255;}
await sharp(bytes,{raw:{width:a.info.width,height:a.info.height,channels:4}}).png().toFile(row.diff);row.rgbaChangedPixels=count;row.bounds={minX,minY,maxX,maxY};row.diffSha256=sha(readFileSync(row.diff));
}row.disposition=row.actualSha256==='932203f38bf4763abc499f0a94dfb5b81798656461a5e5627bde527c00678510'||row.actualSha256==='999d68d5233c5a1da3ac5e2ccb7a4350ceae1fc881e03a7e01c283ab9bf19155'?'exact prior independent approval':row.matchesActive?'unchanged reference':'requires independent inspection';rows.push(row);}
const result={executor,target,active,manifest:folder+'/story.json',renderer:manifest.renderer,dirty:manifest.source.dirty,count:rows.length,changedFromActive:rows.filter(r=>!r.matchesActive).length,changedFromTarget:rows.filter(r=>!r.matchesTarget).length,diffMethod:'Exact decoded RGBA inequality marked red over faded original expected; review aid, not Playwright pixelmatch or acceptance.',rows};writeFileSync(root+'/review-index.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.count,changedFromActive:result.changedFromActive,changedFromTarget:result.changedFromTarget,rows:rows.map(({name,disposition,rgbaChangedPixels})=>({name,disposition,rgbaChangedPixels}))},null,2));
