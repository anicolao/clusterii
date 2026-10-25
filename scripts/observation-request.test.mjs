import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,requestFile,branch} from './observation-request.mjs';
test('only a fresh exact four-size observation request can execute',()=>{
 const parent='a'.repeat(40),head='b'.repeat(40);
 const input={request:{version:1,id:'observation-labels-20261025-02',case:'observation',mode:'generate',specSha256:'2d80a35fe3d67f721d3966ed3c295031f1f9cdfaf244f6ec4d74ea3d882cd5ac',target:'172a6265127d07da33c2e5e40953fd31867a9feb',sourceCommit:parent},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},parent,head,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false};
 assert.equal(validateRequest(input).case,'observation');
 for(const mutation of [{request:{...input.request,specSha256:'0'.repeat(64)}},{requestWasPresent:true},{changed:[requestFile,'src/routes/app.css']},{request:{...input.request,mode:'verify'}},{request:{...input.request,case:'all'}},{request:{...input.request,sourceCommit:head}},{env:{...input.env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...input.env,GITHUB_REF:'refs/heads/main'}}])assert.throws(()=>validateRequest({...input,...mutation}));
});
