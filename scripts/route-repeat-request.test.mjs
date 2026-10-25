import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,requestFile,branch} from './route-repeat-request.mjs';
test('only a fresh exact short generation route repeat request can execute',()=>{
 const parent='a'.repeat(40),head='b'.repeat(40);
 const input={request:{version:1,id:'route-retention-short-20261025-02',case:'route-repeat',mode:'generate',specSha256:'1ecc3a5cbc05c563a67619a6742ea970266b7ad0a697b7911e0ed1a805c644e8',target:'d9025f17534dfd6d72b85acf39f88b8d21c4b6af',sourceCommit:parent},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},parent,head,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false};
 assert.equal(validateRequest(input).case,'route-repeat');
 for(const mutation of [{request:{...input.request,specSha256:'0'.repeat(64)}},{requestWasPresent:true},{changed:[requestFile,'src/routes/app.css']},{request:{...input.request,mode:'verify'}},{request:{...input.request,case:'all'}},{request:{...input.request,sourceCommit:head}},{env:{...input.env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...input.env,GITHUB_REF:'refs/heads/main'}}])assert.throws(()=>validateRequest({...input,...mutation}));
});
