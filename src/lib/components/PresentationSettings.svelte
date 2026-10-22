<script lang="ts">
  import { detailPreference } from "$lib/detail-preference";
  import { motionPreference } from "$lib/motion-preference";
</script>

<section aria-label="Presentation settings">
  <h3>Motion</h3>
  <p>
    Presentation only, saved in this browser. Campaign timing and orders stay
    the same.
  </p>
  <label
    ><input
      type="checkbox"
      checked={$motionPreference.reduce}
      onchange={(event) =>
        motionPreference.setReduce(event.currentTarget.checked)}
    /> Reduce motion</label
  >
  <p role="status" aria-live="polite">
    {$motionPreference.system
      ? "Your device requests reduced motion. It stays reduced with either setting."
      : $motionPreference.effective
        ? "Reduced motion is on."
        : "Following your device’s motion preference."}
  </p>
  {#if !$motionPreference.saved}<p>
      Your choice applies on this page. Browser storage is unavailable, so it
      cannot be saved.
    </p>{/if}
  <h3>Galaxy detail</h3>
  <label
    ><input
      type="checkbox"
      checked={$detailPreference.lower}
      onchange={(event) =>
        detailPreference.setLower(event.currentTarget.checked)}
    /> Lower galaxy detail</label
  >
  <p>
    Remove decorative dust and reference rings. Every system, fleet, route and
    control stays available.
  </p>
  <p role="status" aria-live="polite">
    {$detailPreference.lower
      ? "Lower galaxy detail is on."
      : "Full galaxy decoration is on."}
  </p>
  {#if !$detailPreference.saved}<p>
      This choice applies on this page but cannot be saved because browser
      storage is unavailable.
    </p>{/if}
</section>

<style>
  section {
    display: grid;
    gap: 14px;
  }
  h3,
  p {
    margin: 0;
  }
  p {
    line-height: 1.5;
    color: var(--muted);
  }
  label {
    display: flex;
    gap: 14px;
    align-items: center;
    min-height: 48px;
    cursor: pointer;
  }
  input {
    width: 24px;
    height: 24px;
    accent-color: var(--gold);
  }
</style>
