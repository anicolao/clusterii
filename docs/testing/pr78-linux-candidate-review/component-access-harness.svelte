<script lang="ts">
import { onMount } from "svelte";
let mode = $state("draft");
onMount(()=>{mode=new URLSearchParams(location.search).get("mode") || "draft"});
import FleetRoute from "$lib/components/FleetRoute.svelte";
import {travelFrame,travelFleetId,travelDestination} from "../dev/animations/scenarios";
</script>
<div style="position:fixed;inset:58px 0 0"><FleetRoute view={travelFrame(0)} fleetId={travelFleetId} waypoints={[travelDestination]} pending={mode !== "draft"} error={mode === "retry" ? "Still waiting for acknowledgement." : ""} message={mode === "pending" ? "Awaiting acknowledgement." : ""} onretry={()=>{}} oncommit={()=>{}} onclose={()=>{}} /></div>
