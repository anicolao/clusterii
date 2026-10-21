# Local validation excerpts

These excerpts identify observed local runs; they do not certify hosted OAuth/Scheduler, release readiness or independent review.

## cluster-travel-unit-final2.log

```text
 59 pass
 0 fail
 1193 expect() calls
Ran 59 tests across 3 files. [1.75s]
```

## cluster-travel-live-browser.log

```text
(pass) fleet travel mock: private acknowledged routes, pause, migration and repeat-safe arrivals [19683.70ms]
(pass) fleet travel real: private acknowledged routes, pause, migration and repeat-safe arrivals [30318.04ms]
 0 fail
 184 expect() calls
Ran 2 tests across 1 file. [50.11s]
  ✓  1 tests/browser/fleet-travel.spec.ts:4:1 › ordinary commanders preview, send and recover a real fleet route (16.9s)
  ✓  2 tests/browser/fleet-travel.spec.ts:210:1 › route lab retains the same real departure and arrival under reduced motion (1.1s)
  2 passed (21.3s)
```

## cluster-travel-regression.log

```text
(pass) fleet travel mock: private acknowledged routes, pause, migration and repeat-safe arrivals [2171.54ms]
 27 pass
 17 skip
 0 fail
 1551 expect() calls
Ran 44 tests across 1 file. [91.83s]
  ✓  1 tests/browser/fleet-cancellation.spec.ts:4:1 › ordinary commanders cancel an acknowledged fleet order without losing their draft (13.8s)
  ✓  2 tests/browser/fleet-cancellation.spec.ts:159:1 › cancellation lab preserves released reservations in both motion modes (193ms)
  ✓  3 tests/browser/fleet-reorganization.spec.ts:4:1 › ordinary commanders split and merge fleets without duplicating inventories (18.8s)
  ✓  4 tests/browser/fleet-reorganization.spec.ts:230:1 › reorganization lab preserves split and merge outcomes with reduced motion (248ms)
  4 passed (36.4s)
```

## cluster-travel-final-browser.log

```text
  ✓  1 tests/browser/fleet-travel.spec.ts:4:1 › ordinary commanders preview, send and recover a real fleet route (20.6s)
  ✓  2 tests/browser/fleet-travel.spec.ts:284:1 › route lab retains the same real departure and arrival under reduced motion (1.1s)
  2 passed (25.0s)
```

## cluster-travel-check-final.log

```text
svelte-check found 0 errors and 0 warnings
```

## cluster-travel-lint-final.log

```text
Checked 32 files in 11ms. No fixes applied.
All matched files use Prettier code style!
```
