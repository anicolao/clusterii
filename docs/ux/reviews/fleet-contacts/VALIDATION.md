# Local validation excerpts

Observed local runs; not hosted Scheduler/OAuth certification or independent acceptance.

## cluster-contacts-unit-final2.log

```text
 66 pass
 0 fail
 1278 expect() calls
Ran 66 tests across 4 files. [1089.00ms]
```

## cluster-contacts-live.log

```text
(pass) fleet contacts mock: acquired private facts, missed scans, history and epoch preservation [16075.77ms]
(pass) fleet contacts real: acquired private facts, missed scans, history and epoch preservation [32564.05ms]
 0 fail
 102 expect() calls
Ran 2 tests across 1 file. [48.72s]
```

## cluster-contacts-service-first.log

```text
 27 pass
 17 skip
 0 fail
 1557 expect() calls
Ran 44 tests across 1 file. [91.22s]
```

## cluster-contacts-browser-final.log

```text
  ✓  1 tests/browser/fleet-contacts.spec.ts:4:1 › ordinary observers recover acquired and last-seen fleet contacts (16.5s)
  ✓  2 tests/browser/fleet-contacts.spec.ts:210:1 › fleet contact lab preserves exact acquired facts under replay and reduced motion (340ms)
  ✓  3 tests/browser/lab.spec.ts:2:1 › lab replay, pause, seek and reduced motion preserve production outcomes (515ms)
  ✓  4 tests/browser/lab.spec.ts:88:3 › phone: gallery and lab rendered evidence (20.4s)
  ✓  5 tests/browser/lab.spec.ts:88:3 › desktop: gallery and lab rendered evidence (19.0s)
  ✓  6 tests/browser/lab.spec.ts:88:3 › large: gallery and lab rendered evidence (19.6s)
  ✓  7 tests/browser/lab.spec.ts:88:3 › short: gallery and lab rendered evidence (18.5s)
  7 passed (1.6m)
```

## cluster-contacts-final-evidence.log

```text
(pass) fleet contacts mock: acquired private facts, missed scans, history and epoch preservation [3439.61ms]
 0 fail
 27 expect() calls
  ✓  1 tests/browser/fleet-contacts.spec.ts:4:1 › ordinary observers recover acquired and last-seen fleet contacts (16.5s)
  ✓  2 tests/browser/fleet-contacts.spec.ts:210:1 › fleet contact lab preserves exact acquired facts under replay and reduced motion (355ms)
  ✓  3 tests/browser/fleet-travel.spec.ts:4:1 › ordinary commanders preview, send and recover a real fleet route (17.9s)
  ✓  4 tests/browser/fleet-travel.spec.ts:284:1 › route lab retains the same real departure and arrival under reduced motion (1.1s)
  4 passed (39.1s)
```

## cluster-contacts-captures-final.log

```text
  ✓  1 tests/browser/fleet-contacts.spec.ts:4:1 › ordinary observers recover acquired and last-seen fleet contacts (17.7s)
  ✓  2 tests/browser/fleet-contacts.spec.ts:210:1 › fleet contact lab preserves exact acquired facts under replay and reduced motion (355ms)
  2 passed (21.3s)
```

## cluster-contacts-ui-final.log

```text
svelte-check found 0 errors and 0 warnings
```

## cluster-contacts-lint2.log

```text
Checked 33 files in 11ms. No fixes applied.
All matched files use Prettier code style!
```

## Final encoded capacity reservation

```text
66 pass
0 fail
1282 expect() calls
Ran 66 tests across 4 files. [1176.00ms]
Route capacity fixture: 223 admitted, further orders refused.
```
