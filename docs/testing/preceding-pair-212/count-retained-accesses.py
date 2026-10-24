import zipfile,io,json,urllib.parse,pathlib
archive='/tmp/cluster-strict-208-12561036357/artifact.zip'
seen=set(); report=[]; missing=0
with zipfile.ZipFile(archive) as outer:
 for p in outer.namelist():
  if not p.endswith('-phone/trace.zip'): continue
  name=pathlib.PurePosixPath(p).parts[-2]
  if not (name.startswith('browser-') or any(name.startswith('e2e-%03d-'%i) for i in range(1,10)) or name.startswith('e2e-010-zero-science-contr')): continue
  own=set();calls=0
  with zipfile.ZipFile(io.BytesIO(outer.read(p))) as z:
   names=set(z.namelist())
   def body(part):
    if part.get('text'): return json.loads(part['text'])
    key='resources/'+part.get('_sha1','')
    if key in names:return json.loads(z.read(key))
    return None
   for n in names:
    if not n.endswith('.network'):continue
    for line in z.read(n).splitlines():
     snap=json.loads(line).get('snapshot',{});req=snap.get('request',{});resp=snap.get('response',{})
     if urllib.parse.urlparse(req.get('url','')).path.endswith('/campaignKey') and resp.get('status')==200:
      calls+=1
      try:
       a=body(req.get('postData',{}));b=body(resp.get('content',{}))
       if a is None or b is None: missing+=1;continue
       game=a.get('data',{}).get('gameId');joined=b.get('result',{}).get('joined')
       if isinstance(game,str) and joined is True:own.add(game)
      except (ValueError,KeyError,TypeError):missing+=1
  seen.update(own);report.append({'trace':p,'successfulHttpKeyCalls':calls,'distinctJoinedCampaigns':len(own)})
print(json.dumps({'sourceRun':40091257252,'sourceHead':'d0804122','scope':'retained phone traces sorted before feature010 real story; successful joined:true key responses only','traceCount':len(report),'distinctJoinedCampaignLowerBound':len(seen),'unavailableBodies':missing,'traces':report,'limits':['Observed authorized access is not a full directory count, active listener count or exact database cardinality at the failing boundary.','No IDs, keys, response bodies or document values are exported.','No emulator or story was executed.']},indent=2))
