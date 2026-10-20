"""Validate the step 0 review tables and independent worked examples; no game service."""
from pathlib import Path
from decimal import Decimal, getcontext, ROUND_FLOOR, ROUND_CEILING
import json,re
getcontext().prec=40
c=json.loads(Path('rules/cluster-v0.1.0.json').read_text())
assert c['playerCounts']==[4,8,12]
assert all(p%4==0 for p in c['playerCounts'])
assert all(p*c['starsPerPlayer']%4==0 for p in c['playerCounts'])
assert len(c['factions'])==4
for f in c['factions']:
 assert set(f['affinity'])==set(c['starClasses'])
 assert sum(Decimal(str(x)) for x in f['affinity'].values())==Decimal('4.2')
 assert f['affinity'][f['homeClass']]==1.4
assert sum(c['defaultFocus'].values())==c['focusPoints']==100
assert c['maximumCampaignTicks']*c['tickSeconds']==30*24*3600
assert len(c['startingResearch'])==8
assert set(c['developments'])==set(c['defaultFocus'])
floor=lambda x:x.quantize(Decimal('.001'),rounding=ROUND_FLOOR)
assert floor(Decimal('2.8')**Decimal('1.05'))==Decimal('2.947')
assert floor(Decimal(1000)**Decimal('1.05'))==Decimal('1412.537')
assert (Decimal(80)*Decimal('1.15')**2).to_integral_value(rounding=ROUND_CEILING)==106
assert (Decimal(128)*Decimal('.60')).to_integral_value(rounding=ROUND_CEILING)==77
assert (Decimal(128)*Decimal('.64')).to_integral_value(rounding=ROUND_CEILING)==82
assert int(Decimal(1000**2-500**2).sqrt())==866
assert int((Decimal(2*100**2-100**2)/2).sqrt())==70
count=0
for A in range(0,41):
 for D in range(0,41):
  for a in range(1,11):
   for d in range(1,11):
    x,y=A,D
    while x>0 and y>0:
     x=max(0,x-d)
     if x>0:y=max(0,y-a)
    if A==0 or D==0: expected=(A,D)
    else:
     q=(A+d-1)//d;r=(D+a-1)//a
     expected=(A-r*d,0) if r<q else (0,D-(q-1)*a)
    assert (x,y)==expected,(A,D,a,d,x,y,expected)
    count+=1
files=['README.md','IMPLEMENTATION_PLAN.md','UX_DESIGN.md','RULES_SPEC.md','TECHNICAL_CONTRACT.md','docs/design/STEP_0_REVIEW.md']
links=0
for name in files:
 p=Path(name)
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if target.startswith(('http:','https:','#')):continue
  target=target.split('#')[0]
  if target:
   assert (p.parent/target).exists(),(name,target)
   links+=1
print(f'Validated config, arithmetic examples, {count:,} ground-combat cases, and {links} local links.')
