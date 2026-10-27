<script lang="ts">
import FleetRoute from "$lib/components/FleetRoute.svelte";
import {travelFrame,travelFleetId} from "../dev/animations/scenarios";
</script>
<div style="position:fixed;inset:58px 0 0"><FleetRoute view={travelFrame(0)} fleetId={travelFleetId} waypoints={[]} oncommit={()=>{}} onclose={()=>{}} /></div>
