<script lang="ts">
import FleetRoute from "$lib/components/FleetRoute.svelte";
import {travelFrame,travelFleetId,travelDestination} from "../dev/animations/scenarios";
let pending=$state(false),busy=$state(false),accepted=$state(false),commits=$state(0);
let waypoints=$state([travelDestination]);
</script>
<label><input type="checkbox" bind:checked={pending}/>Pending</label>
<label><input type="checkbox" bind:checked={busy}/>Busy</label>
<label><input type="checkbox" bind:checked={accepted}/>Accepted</label>
<output aria-label="Commit calls">{commits}</output>
<output aria-label="Bound waypoints">{JSON.stringify(waypoints)}</output>
<div style="height:85svh;min-height:500px">
<FleetRoute view={travelFrame(accepted?2400:0)} fleetId={travelFleetId} bind:waypoints {pending} {busy} oncommit={()=>commits++} onclose={()=>{}} />
</div>
