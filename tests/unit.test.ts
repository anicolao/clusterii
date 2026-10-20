import { expect, test } from "bun:test";
import { newKey, provider, wrap, unwrap } from "../shared/crypto";
import { profileContext, reduceProfile } from "../shared/profile";
const codec = provider("mock");
const context = profileContext("alice", 1);
test("JSON, Unicode, escaping, null and newlines round trip through object and grant", async () => {
  const key = newKey(),
    kek = newKey();
  const value = {
    name: '银河\n"A\\B"🌌',
    nested: [null, true, 27, { text: "é" }],
  };
  const envelope = await codec.seal(value, key, context);
  const grant = await wrap(key, kek, "alice", context, "mock");
  expect(
    await codec.open<typeof value>(
      envelope,
      await unwrap(grant, kek, "alice", context, "mock"),
      context,
    ),
  ).toEqual(value);
});
test("wrong keys, modified bodies, game, recipient, epoch and revision fail closed", async () => {
  const key = newKey(),
    kek = newKey();
  const envelope = await codec.seal({ alias: "Alice" }, key, context);
  const grant = await wrap(key, kek, "alice", context, "mock");
  await expect(codec.open(envelope, newKey(), context)).rejects.toThrow(
    "Wrong key",
  );
  await expect(
    codec.open(
      { ...envelope, ciphertext: envelope.ciphertext + "a" },
      key,
      context,
    ),
  ).rejects.toThrow();
  for (const other of [
    { ...context, gameId: "other" },
    { ...context, epoch: 2 },
    { ...context, revision: 2 },
    { ...context, objectId: "other" },
    { ...context, keyVersion: 2 },
  ])
    await expect(codec.open(envelope, key, other)).rejects.toThrow();
  await expect(unwrap(grant, kek, "bob", context, "mock")).rejects.toThrow();
  await expect(
    unwrap(grant, newKey(), "alice", context, "mock"),
  ).rejects.toThrow();
  await expect(provider("real").open(envelope,key,context)).rejects.toThrow();
});
test("profile reducer validates data and rejects lost updates", () => {
  const action = {
    kind: "profile.set",
    expectedRevision: 0,
    profile: { alias: "  E\u0301toile  ", portrait: "G1" },
  };
  expect(reduceProfile(0, action)).toEqual({ alias: "Étoile", portrait: "G1" });
  expect(() => reduceProfile(1, action)).toThrow("conflict");
  for (const alias of ["a", "x".repeat(25), "hello\nworld", "a\u200bb"])
    expect(() =>
      reduceProfile(0, { ...action, profile: { alias, portrait: "G1" } }),
    ).toThrow("invalid");
  expect(() =>
    reduceProfile(0, {
      ...action,
      profile: { alias: "Alice", portrait: "fake" },
    }),
  ).toThrow();
});

import {requestedCampaign, campaignHref} from '../src/lib/campaign-navigation';
test('campaign sign-in return accepts only canonical IDs and retains the preview base',()=>{
  const id='12345678-1234-4321-9876-123456789abc';
  expect(requestedCampaign(`?campaign=${id}`)).toBe(id);
  expect(campaignHref('/clusterii/pr8',id)).toBe(`/clusterii/pr8/campaigns/?campaign=${id}`);
  for(const unsafe of ['https://example.test','//example.test','../admin','-'.repeat(36),'123',''])expect(requestedCampaign(`?campaign=${encodeURIComponent(unsafe)}`)).toBe(null);
});

import {resumableCampaign} from '../src/lib/campaign-navigation';
import {createCampaign,campaignDirectory} from '../shared/campaign';
test('Continue uses accessible active metadata and the remembered selection only',()=>{
  const a=campaignDirectory(createCampaign('one',{kind:'campaign.create',expectedRevision:0,name:'One',capacity:4,mode:'mock',development:true},'a'.repeat(64),0));
  const b={...a,id:'two',name:'Two'};
  const activeA={...a,phase:'active' as const},activeB={...b,phase:'active' as const};
  expect(resumableCampaign([],[],null)).toBeNull();
  expect(resumableCampaign([a],['one'],'one')).toBeNull();
  expect(resumableCampaign([activeA],['one'],null)?.id).toBe('one');
  expect(resumableCampaign([activeA,activeB],['one','two'],'two')?.id).toBe('two');
  expect(resumableCampaign([activeA,activeB],['one','two'],null)).toBeNull();
  expect(resumableCampaign([activeA,activeB],['one'],'two')?.id).toBe('one');
  expect(resumableCampaign([activeA],[],'one')).toBeNull();
  expect(resumableCampaign([{...activeA,phase:'completed'} as unknown as typeof a],['one'],'one')).toBeNull();
});

import {crc32c} from '../functions/src/key-protection';
test('AES-GCM reads an independent OpenSSL vector with authenticated Cluster metadata',async()=>{
  const ctx={gameId:'fixture-game',objectId:'fixture-object',revision:7,epoch:2,keyVersion:1};
  const envelope={...ctx,format:1 as const,mode:'real' as const,algorithm:'AES-256-GCM' as const,nonce:'0'.repeat(24),ciphertext:'tYUtWD4TCglibP/x/ZLxeREUaqkXRLL3898=',tag:'1797af5ce1bb72848993b8b0520bd6dc'};
  expect(await provider('real').open<{message:string}>(envelope,'0'.repeat(64),ctx)).toEqual({message:'Galactic ☃'});
  expect(crc32c(new TextEncoder().encode('123456789'))).toBe(0xe3069283);
});
test('real envelopes and recipient grants reject substitution and never accept mock data',async()=>{
  const key=newKey(),kek=newKey(),real=provider('real');
  const value={secret:'hidden fleet',unicode:'银河 🌌',nested:[null,true,17]};
  const a=await real.seal(value,key,context),b=await real.seal(value,key,context);
  expect(a.nonce).not.toBe(b.nonce);expect(a.ciphertext).not.toContain('hidden fleet');expect(a.ciphertext).not.toContain(key);
  expect(await real.open<typeof value>(a,key,context)).toEqual(value);
  const grant=await wrap(key,kek,'alice',context,'real');
  expect(await unwrap(grant,kek,'alice',context,'real')).toBe(key);
  await expect(unwrap(grant,kek,'bob',context,'real')).rejects.toThrow();
  await expect(real.open(a,newKey(),context)).rejects.toThrow();
  for(const field of ['nonce','tag','ciphertext'] as const){const bytes=a[field];const changed=(bytes[0]==='a'?'b':'a')+bytes.slice(1);await expect(real.open({...a,[field]:changed},key,context)).rejects.toThrow();}
  for(const other of [{...context,gameId:'another'},{...context,objectId:'another'},{...context,epoch:2},{...context,revision:2},{...context,keyVersion:2}]) await expect(real.open({...a,...other},key,other)).rejects.toThrow();
  await expect(real.open(await provider('mock').seal(value,key,context),key,context)).rejects.toThrow();
  await expect(provider('mock').open(a,key,context)).rejects.toThrow();
});
