# PR116 publication investigation

Reviewer03:12 requested diagnosis of run39915188529 at source66cc0052bd75235c5520139db55c1053bca8a3f8. The unchanged verifier failed fetching C-vUTJjQ.js at07:06:00UTC. Its log does not retain the response status or cache headers, so a historical cache/deployment cause cannot be established.

Read-only inspection at07:13UTC found the exact source/build revision, entry HTML and chunk served successfully. Both plain and query-qualified requests returned identical bytes. Served entry, chunk and revision bytes exactly match the current gh-pages contents (publication commit c7152e2ca526488789e5233a6888068f30fe45ab). The chunk SHA256 is3617ac673877508396136cf6a13b56cd7774bf95edd26f0be71cd47412bb0f3f. This excludes a missing asset in that committed publication, but cannot reconstruct the failed edge response.

Pages records show a successful build of that commit completed07:05:58, two seconds before failure; a duplicate build request errored immediately at07:04:55. No subsequent pr116 publication appears between failure and inspection. Neither overwrite nor stale HTML is demonstrated. The unchanged verifier subsequently passed all29 references against exact66cc005. No workflow rerun, verifier modification or production fix was justified. This later verification does not erase the original failed CI result or certify a future head.

Retained request headers, build records, original failure and later exact verification accompany this report. Science visual candidates remain unapproved.
