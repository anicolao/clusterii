import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,requestFile,branch} from './route-repeat-request.mjs';
test('only a fresh exact short generation maintenance request can execute',()=>{
 const parent='a'.repeat(40),head='b'.repeat(40);
 const input={request:{version:1,id:'route-repeat-20261025-01',case:'route-repeat',mode:'generate',specSha256:'03b9bb1bc4e56a66b7fb3b13c871d296a6ba9bfaf3c8502295181b777545a0df',target:'4da928d94a6261cd305e1faeac108597dd4f06b2',sourceCommit:parent},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},parent,head,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false};
 assert.equal(validateRequest(input).case,'route-repeat');
 for(const mutation of [{request:{...input.request,specSha256:'0'.repeat(64)}},{requestWasPresent:true},{changed:[requestFile,'src/routes/app.css']},{request:{...input.request,mode:'verify'}},{request:{...input.request,case:'all'}},{request:{...input.request,sourceCommit:head}},{env:{...input.env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...input.env,GITHUB_REF:'refs/heads/main'}}])assert.throws(()=>validateRequest({...input,...mutation}));
});
