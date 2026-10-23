# PR124 publication failure and later read-only recovery

Original run39979039699 atfb70cc330f0a9ce58e74b362f7c6a9ff65176270 failed at15:39UTC: entry/revision matched, asset0.q4AAvEAb.css did not return success. Preserve full original failed step here; it did not report status/body/cache headers, so original response classification remains unknown.

Read-only15:51UTC observations: revision and entry identify the samefb70cc33 source; referenced CSS now returns200. Original publication commit45b376a2aa6933a66cd8ac56b9d3b364dea564f8 contains that exact asset (Git blob4a928d688d9fb5598fa626c1967f8c46be275356,size13683). This rules out omission from that committed publication tree. The original runner response/deployment edge state is still missing: stale cache, propagation or another transient response is not proven. No code/verifier/deadline change or publication rerun.

A later unchanged verify-pages invocation passes exact source/build and29 static references. This establishes later recovery atfb70cc33 only, not the cause of the original failure or an automatic certification of another head. Latest124 app/story runtime remains a separate pending gate.
