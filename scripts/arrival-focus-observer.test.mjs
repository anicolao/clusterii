import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,existsSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {recordArrivalFocus,phases} from "../tests/e2e/helpers/arrival-focus-observer.mjs";
test("observer is opt-in, allowlisted, capped and retains every phase without browser mutations", async()=>{
 const cwd=process.cwd(),dir=mkdtempSync(join(tmpdir(),"cluster-focus-fixture-")),old=process.env.CLUSTER_ARRIVAL_FOCUS;let evaluations=0;
 const page={evaluate:async()=>{evaluations++;return {documentHasFocus:true,visibility:"visible",openerFocused:true,activeElement:{tag:"button",isOpener:true,focusVisible:true},opener:{tag:"button",isOpener:true,focusVisible:true,outline:{style:"solid",width:"3px",offset:"5px",color:"rgb(255, 225, 164)"},bounds:{x:1,y:2,width:3,height:4}}};}};
 try{
  process.chdir(dir);delete process.env.CLUSTER_ARRIVAL_FOCUS;await recordArrivalFocus(page,"before-escape","owner");assert.equal(evaluations,0);assert.equal(existsSync("ci-evidence"),false);
  process.env.CLUSTER_ARRIVAL_FOCUS="1";
  await assert.rejects(()=>recordArrivalFocus(page,"private-text","owner"));await assert.rejects(()=>recordArrivalFocus(page,"before-escape","uid"));
  for(const player of ["owner","peer"])for(const phase of phases)await recordArrivalFocus(page,phase,player);
  const rows=readFileSync("ci-evidence/arrival-focus/observations.ndjson","utf8").trim().split("\n").map(JSON.parse);assert.equal(rows.length,phases.length*2);assert.equal(rows.at(-1).sequence,rows.length);
  for(let i=rows.length;i<96;i++)await recordArrivalFocus(page,"before-png","owner");await assert.rejects(()=>recordArrivalFocus(page,"after-png","owner"),/cap/);assert.equal(evaluations,96);
 }finally{process.chdir(cwd);if(old===undefined)delete process.env.CLUSTER_ARRIVAL_FOCUS;else process.env.CLUSTER_ARRIVAL_FOCUS=old;rmSync(dir,{recursive:true});}
});
