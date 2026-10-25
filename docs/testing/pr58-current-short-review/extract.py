import io,json,subprocess,urllib.request,urllib.error,zipfile,pathlib
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args): return None
req=urllib.request.Request('https://api.github.com/repos/anicolao/clusterii/actions/artifacts/12593406526/zip',headers={'Authorization':'Bearer '+subprocess.check_output(['gh','auth','token'],text=True).strip(),'Accept':'application/vnd.github+json'})
try: urllib.request.build_opener(NoRedirect).open(req,timeout=30)
except urllib.error.HTTPError as e:
 if e.code!=302: raise
 url=e.headers['Location']
class Remote(io.RawIOBase):
 def __init__(self): self.pos=0; self.total=0
 def seekable(self): return True
 def readable(self): return True
 def tell(self): return self.pos
 def seek(self,offset,whence=0):
  self.pos=offset if whence==0 else self.pos+offset if whence==1 else 2951044623+offset
  return self.pos
 def read(self,n=-1):
  if n<0:n=2951044623-self.pos
  n=min(n,2951044623-self.pos)
  if n<=0:return b''
  if n>16000000 or self.total+n>160000000:raise RuntimeError('bounded extraction budget exceeded')
  request=urllib.request.Request(url,headers={'Range':f'bytes={self.pos}-{self.pos+n-1}'})
  with urllib.request.urlopen(request,timeout=40) as r:
   if r.status!=206:raise RuntimeError('range not supported')
   if r.headers.get('Content-Range')!=f'bytes {self.pos}-{self.pos+n-1}/2951044623':raise RuntimeError('incorrect Content-Range')
   data=r.read(n+1)
  if len(data)!=n:raise RuntimeError('unexpected range size')
  self.pos+=n;self.total+=n;return data
r=Remote(); out=pathlib.Path('/tmp/cluster-pr58-current-short');out.mkdir(exist_ok=True)
with zipfile.ZipFile(r) as z:
 import stat,hashlib
 names=[n for n in z.namelist() if n.startswith("test-results/stories/live-fleet-reorganization/short/linux-arm64/") and n.endswith((".png",".json",".md"))]
 assert names,"No requested family"
 print("selected",len(names),flush=True)
 (out/"zip-selected-index.json").write_text(json.dumps([{"path":i.filename,"crc32":i.CRC,"compressed":i.compress_size,"bytes":i.file_size} for i in z.infolist() if i.filename in names],indent=2))
 rows=[]
 for n in names:
  info=z.getinfo(n);rel=pathlib.PurePosixPath(n)
  assert not rel.is_absolute() and ".." not in rel.parts and not stat.S_ISLNK(info.external_attr>>16),"unsafe path"
  dest=out/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  assert not dest.exists(),"collision"
  data=z.read(n);dest.write_bytes(data)
  rows.append({"path":str(dest),"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)})
 (out/"selected-hashes.json").write_text(json.dumps(rows,indent=2))
 (out/"transfer.json").write_text(json.dumps({"files":len(names),"transferred":r.total,"archiveBytes":2951044623,"archiveSha256Verified":False,"selectedCRCVerified":True},indent=2))
 print("files",len(names),"downloaded",r.total,flush=True)
