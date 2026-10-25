from pathlib import Path
import re,json,hashlib,subprocess,collections
raw=Path('/tmp/cluster-pr63-strict-failed.log');lines=raw.read_text().splitlines();clean=[]
for line in lines:
 t=line.split('\t',2)[-1];t=re.sub(r'^\d{4}-\d\d-\d\dT\S+Z ','',t);t=re.sub(r'\x1b\[[0-9;]*m','',t);clean.append(t)
text='\n'.join(clean);matches=list(re.finditer(r'^\s*(\d+)\) \[([^]]+)\] (.+)$',text,re.M));assert len(matches)==76
rows=[];parent='7f56ac16e93503cec85839c6ba41bf7da4096eb4';head='9050d65ecd1589d44500690750a27a9d0821a42f'
def exists(ref,p):return subprocess.run(['git','cat-file','-e',ref+':'+p],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
for i,m in enumerate(matches):
 end=matches[i+1].start() if i+1<len(matches) else text.find('  76 failed',m.end());b=text[m.end():end];err=re.search(r'^\s*(?:Error:|TimeoutError:|Test timeout)[^\n]*',b,re.M);loc=re.search(r'^\s*Locator:[^\n]*',b,re.M)
 category='missing-reference' if 'Missing reviewed baseline/renderer:' in b else 'click-timeout' if 'TimeoutError: locator.click' in b else 'ui-readiness-acknowledgement' if 'Error: expect(locator)' in b else 'unclassified'
 row={'number':int(m.group(1)),'viewport':m.group(2),'test':m.group(3),'category':category,'firstError':err.group(0).strip() if err else None,'locator':loc.group(0).strip() if loc else None}
 if category=='missing-reference':
  path=re.search(r'Missing reviewed baseline/renderer: .*?/(tests/browser/story-baselines/.*?)\. Generate',b).group(1);renderer=str(Path(path).parent/'renderer.json');row.update(path=path,absentAtOldHead=not exists(head,path),presentInReviewedParent=exists(parent,path),rendererPresentInReviewedParent=exists(parent,renderer))
 rows.append(row)
events=[]
for term in ['socket hang up','ECONNREFUSED','UNAVAILABLE','OutOfMemory','SIGKILL']:
 hits=[(i+1,re.search(r'2026-\S+Z',l).group(0)) for i,l in enumerate(lines) if term in l and re.search(r'2026-\S+Z',l)];events.append({'marker':term,'count':len(hits),'first':hits[0] if hits else None,'last':hits[-1] if hits else None})
d=Path('docs/testing/pr63-stale-preflight');d.mkdir(parents=True,exist_ok=True)
report={'run':39723194222,'head':head,'date':'2026-10-22','status':'terminal failure, historical not current recovery evidence','rawLog':str(raw),'rawSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'summary':{'failed':76,'passed':88,'skipped':8},'counts':dict(collections.Counter(r['category'] for r in rows)),'byViewport':{v:dict(collections.Counter(r['category'] for r in rows if r['viewport']==v)) for v in ['phone','desktop','large','short']},'connectionMarkers':events,'failures':rows}
(d/'classification.json').write_text(json.dumps(report,indent=2)+'\n')
print(report['counts']);print(report['byViewport']);print('Missing covered by parent',sum(r.get('presentInReviewedParent',False) for r in rows),'of',34);print('stillmissing',[r['path'] for r in rows if r['category']=='missing-reference' and not r['presentInReviewedParent']]);print(collections.Counter(r['locator'] for r in rows if r['category']=='ui-readiness-acknowledgement'))
