import pathlib, hashlib, json, zipfile, stat, struct, sys
root=pathlib.Path(sys.argv[1]); metadata=json.loads(pathlib.Path(sys.argv[2]).read_text())['artifacts'];assert len(metadata)==1
artifact=metadata[0];archive=root/'artifact.zip';b=archive.read_bytes();digest=hashlib.sha256(b).hexdigest();assert len(b)==artifact['size_in_bytes'];assert 'sha256:'+digest==artifact['digest'];assert not artifact['expired'];assert artifact['workflow_run']['head_sha']=='bf6093b65b48790fa7871e9b07b9e8b46750a861'
out=root/'originals';assert not out.exists();seen=set();inventory=[]
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for e in z.infolist():
  p=pathlib.PurePosixPath(e.filename);assert not p.is_absolute() and '..' not in p.parts and '\\' not in e.filename and not stat.S_ISLNK(e.external_attr>>16) and e.filename not in seen
  seen.add(e.filename)
  if e.is_dir():continue
  data=z.read(e);dest=out/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);inventory.append({'path':e.filename,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
folders=list(out.glob('recovery-contacts-*'));assert len(folders)==1;folder=folders[0];result=json.loads((folder/'result.json').read_text());assert result['status']=='complete-candidates' and result['images']==88 and result['testExit']==0
source=json.loads((folder/'source.json').read_text());assert source['commit']=='bf6093b65b48790fa7871e9b07b9e8b46750a861';assert source['specHash']=='d80d55f3550c4e55a43aae202fbfcb611275c248cd93b61831b116c73419b7f4'
identity=(out/'nix-renderer/image-identity.txt').read_text().splitlines();assert identity==['sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321','sha256:7e11780237209f8747e8023d2ba777723d9aba451a548bbcc0563511e28a2c9a']
contracts={
'inspect-empty-contact-history':'UX-07 / UX-08 / UX-16 · honest empty intelligence; distinct private fleet view; reachable controls',
'commit-real-fleet':'UX-08 / UX-14 · accepted force reservation, conservation and private orders',
'read-current-contact':'UX-07 / UX-16 · acquired facts, actual observation tick, no private route disclosure',
'select-and-resize-contact':'UX-03 / UX-07 / UX-16 · keyboard selection, resize, unchanged authorized facts',
'read-current-coordinates-age':'UX-07 / UX-16 · current report age and bounded reading',
'read-current-coordinates-facts':'UX-07 / UX-16 · complete observed complement/coordinates and private-route explanation',
'recover-last-seen-record':'UX-07 / UX-14 · last-seen retained record; no inferred current position',
'read-retained-coordinates-age':'UX-07 / UX-16 · historical tick and explicit unknown current position',
'read-retained-coordinates-facts':'UX-07 / UX-16 · historical complement/coordinates and bounded reading',
'reload-private-contact-history':'UX-07 / UX-14 / UX-16 · real reload, latest loaded history and conserved facts',
'return-to-chart-by-keyboard':'UX-03 / UX-16 · Escape and opener focus with no command',
'review-galaxy-overview':'UX-03 / UX-16 · catalogue overview, selected-label clearance, unobscured system controls',
}
lines=['# Current pinned-Linux contact family — independent review index','',
'UNAPPROVED CANDIDATES. Generation is not strict success or baseline permission. No failed-verification image is included.', '',
f"Run {artifact['workflow_run']['id']}; artifact {artifact['id']}; expiry {artifact['expires_at']}. Archive {archive}, {len(b)} bytes, SHA256 `{digest}`.",'',
'Source parent `6df623a7`; executor/capture `bf6093b65b48790fa7871e9b07b9e8b46750a861`; feature `tests/e2e/012-fleet-contacts/contacts.spec.ts`; spec SHA256 `d80d55f3550c4e55a43aae202fbfcb611275c248cd93b61831b116c73419b7f4`.', '',
'Pinned renderer: Playwright1.61.1 noble ARM image manifest `824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321`, actual config `7e11780237209f8747e8023d2ba777723d9aba451a548bbcc0563511e28a2c9a`. Four manifests, source/spec/renderer, ZIP size/SHA/CRC/safe paths and all88 PNG dimensions/hashes verified.', '',
'Contract: UX_DESIGN sections04 (plate03 galaxy),09 (honest intelligence),10 (plate08 fleet preparation) and UX-03/07/08/14/16 inventory. No separate invented fleet-contact concept plate. Scene position is acquired or last-observed, never inferred current movement. All real action/receipt/projection/conservation/reload checks remain; canonical administrative projection corroboration is not ordinary foreign-read-denial certification.', '',
'Every capture is reduced-motion. The reload step briefly checks no-preference facts/rail/privacy, then restores reduce before capturing. This is not normal-motion animation/frame/timing approval. Domain clocks and entropy controls are explicit harness steps, not hosted scheduling or production randomness certification. Number gaps are harness/non-capture steps; each size has exactly22 illustrated viewpoints.', '',
'Review against plate03 and the written contract, not just previous baselines. Timeout213, chart prominence/HUD fidelity, broader authorization/hosted/KMS and release remain separate open gates. Large images require native-resolution inspection for typography; thumbnails alone are not that inspection.','']
records=[]
for size,(width,height) in {'phone':(393,852),'desktop':(1440,1000),'large':(3840,2160),'short':(1280,720)}.items():
 directory=folder/'stories/live-fleet-contacts'/size/'linux-arm64';m=json.loads((directory/'story.json').read_text());assert m['status']=='passed' and m['mode']=='generate' and m['platform']=='linux-arm64' and m['project']==size;assert m['source']['dirty']==False and m['source']['commit']==source['commit'] and m['source']['specSha256']==source['specHash'];assert m['renderer']['motion']=='reduce';assert not (directory/'FAILED.json').exists()
 views=[(step,view) for step in m['steps'] for view in step['views']];assert len(views)==22;assert len(set(v['image'] for _,v in views))==22;assert set(v['image'] for _,v in views)==set(p.name for p in directory.glob('*.png'))
 lines += [f'## {size} — {width} × {height}', '',f'[Original generated narrative]({directory}/README.md) · [Manifest]({directory}/story.json)', '', '| # / exact original | Player | Named outcome | Contract | SHA256 |','| --- | --- | --- | --- | --- |']
 for n,(step,v) in enumerate(views,1):
  p=directory/v['image'];data=p.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack('>II',data[16:24])==(width,height);sha=hashlib.sha256(data).hexdigest();contract=contracts[step['id']];ack=step['acknowledgement'].replace('|','\\|');lines.append(f"| {n:02d} [{v['image']}]({p}) | {v['player']} | {ack} | {contract} | `{sha}` |")
  records.append({'viewport':size,'step':step['id'],'player':v['player'],'path':str(p),'sha256':sha,'bytes':len(data),'dimensions':[width,height],'contract':contract,'acknowledgement':step['acknowledgement'],'verifications':step['verifications']+v['verifications']})
 lines.append('')
(root/'REVIEW_INDEX.md').write_text('\n'.join(lines)+'\n');(root/'review-index.json').write_text(json.dumps(records,indent=2)+'\n');(root/'verified.json').write_text(json.dumps({'artifact':artifact,'archive':str(archive),'source':source,'imageIdentities':identity,'verifiedImages':len(records),'entries':inventory},indent=2)+'\n');print('Verified complete current family:',len(records),'PNGs;',len(inventory),'files; index',root/'REVIEW_INDEX.md')
