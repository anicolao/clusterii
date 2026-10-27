import urllib.request, urllib.error, subprocess, io, zipfile, json, hashlib, shutil
from pathlib import Path
out=Path('/Users/anicolao/projects/games/clusterii-review-recovery/docs/testing/pr77-dependent-route-review');out.mkdir(exist_ok=True)
meta=json.loads(subprocess.check_output(['gh','api','repos/anicolao/clusterii/actions/artifacts/12724315683']))
(out/'artifact.json').write_text(json.dumps(meta,indent=2))
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): return None
token=subprocess.check_output(['gh','auth','token'],text=True).strip()
req=urllib.request.Request(meta['archive_download_url'],headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'})
try: urllib.request.build_opener(NoRedirect).open(req)
except urllib.error.HTTPError as e:
 if e.code!=302: raise
 url=e.headers['Location']
class Remote(io.RawIOBase):
 def __init__(self): self.pos=0;self.total=0;self.etag=None
 def seekable(self):return True
 def readable(self):return True
 def tell(self):return self.pos
 def seek(self,off,whence=0):
  self.pos=off if whence==0 else (self.pos+off if whence==1 else meta['size_in_bytes']+off);return self.pos
 def read(self,n=-1):
  n=min(n if n>=0 else meta['size_in_bytes']-self.pos,meta['size_in_bytes']-self.pos)
  if n<=0:return b''
  assert n<64*1024**2 and self.total+n<180*1024**2
  assert shutil.disk_usage(out).free>2559296*1024
  start=self.pos;end=start+n-1
  with urllib.request.urlopen(urllib.request.Request(url,headers={'Range':f'bytes={start}-{end}'}),timeout=60) as r:
   assert r.status==206 and r.headers['Content-Range']==f'bytes {start}-{end}/{meta["size_in_bytes"]}'
   etag=r.headers.get('ETag');assert self.etag in (None,etag);self.etag=etag
   data=r.read(n+1);assert len(data)==n
  self.pos+=n;self.total+=n;return data
remote=Remote();proof=[]
with zipfile.ZipFile(remote) as z:
 selected=[i for i in z.infolist() if '016-open-route-1-fleet-marshal-' in i.filename and i.filename.endswith('.png') and any(s in i.filename for s in ['interrupted-fleet-route','paused-fleet-travel'])]
 assert len(selected)==24,len(selected)
 for i in selected:
  parts=i.filename.split('/');family=next(s for s in parts if s in ['interrupted-fleet-route','paused-fleet-travel']);viewport=parts[parts.index(family)+1];name=family+'-'+viewport+'-'+parts[-1]
  data=z.read(i);(out/name).write_bytes(data)
  proof.append({'entry':i.filename,'file':name,'crc32':i.CRC,'sha256':hashlib.sha256(data).hexdigest()})
(out/'extraction.json').write_text(json.dumps({'entries':proof,'rangeBytes':remote.total,'wholeArchiveShaVerified':False},indent=2))
print('Verified and extracted',len(proof),'PNGs;',remote.total,'range bytes')
