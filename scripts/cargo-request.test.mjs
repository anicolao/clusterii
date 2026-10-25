import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,requestFile,branch} from './cargo-request.mjs';
test('only a fresh exact four-size cargo request can execute',()=>{
 const parent='a'.repeat(40),head='b'.repeat(40);
 const input={request:{version:1,id:'cargo-20261025-01',case:'cargo',mode:'generate',target:'df86305fa1532e5f3b75d2a28fee9d38037e903b',sourceCommit:parent},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},parent,head,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false};
 assert.equal(validateRequest(input).case,'cargo');
 for(const mutation of [{requestWasPresent:true},{changed:[requestFile,'src/routes/app.css']},{request:{...input.request,mode:'verify'}},{request:{...input.request,case:'all'}},{request:{...input.request,sourceCommit:head}},{env:{...input.env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...input.env,GITHUB_REF:'refs/heads/main'}}])assert.throws(()=>validateRequest({...input,...mutation}));
});
