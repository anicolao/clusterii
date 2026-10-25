import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,requestFile,branch} from './route-recovery-request.mjs';
test('only a fresh exact four-size route-recovery request can execute',()=>{
 const parent='a'.repeat(40),head='b'.repeat(40);
 const input={request:{version:1,id:'route-recovery-20261025-02',case:'route-recovery',mode:'generate',target:'012327210222864831651e152c9bb7ef3e4e3372',sourceCommit:parent},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},parent,head,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false};
 assert.equal(validateRequest(input).case,'route-recovery');
 for(const mutation of [{requestWasPresent:true},{changed:[requestFile,'src/routes/app.css']},{request:{...input.request,mode:'verify'}},{request:{...input.request,case:'all'}},{request:{...input.request,sourceCommit:head}},{env:{...input.env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...input.env,GITHUB_REF:'refs/heads/main'}}])assert.throws(()=>validateRequest({...input,...mutation}));
});
