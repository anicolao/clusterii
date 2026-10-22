<script lang="ts">
  import { rules } from "@shared/rules";
  import { layer, type Development } from "@shared/construction";
  let {
    chosen,
    name,
    count,
    capacity,
    quote,
  }: {
    chosen: Development;
    name: string;
    count: number;
    capacity: number;
    quote: number;
  } = $props();
</script>

<details class="construction-rules">
  <summary>Construction rules</summary>
  <p class="scope">
    The campaign continues. Development rules remain under review.
  </p>
  <h3>Price and capacity</h3>
  <p>
    {name} needs {layer(chosen)} control. Its base price is {rules.developments[
      chosen
    ].baseCost} credits. Each completed or queued development of this type multiplies
    the next price by {rules.constructionCostGrowth}; the result rounds up to
    whole credits.
  </p>
  <p>
    Here, {count} completed or queued gives a quote of {quote / 1000} credits. Capacity
    is {capacity} of this type. Terraforming expands capacity; it does not shorten
    construction.
  </p>
  <h3>Reservation and progress</h3>
  <p>
    Choosing a development spends nothing. Build requests an order; wait for its
    acknowledgement. Acceptance reserves the quoted credits. Each layer holds up
    to {rules.constructionQueuePerLayer} orders and builds one at a time. This development
    takes {rules.developments[chosen].buildTicks} advances, beginning after the tick
    when it starts. Pauses stop progress.
  </p>
  <h3>Cancellation and control</h3>
  <p>
    Cancellation is a separate order. Its execution refunds the full reservation
    before any progress, or half after progress, rounded down to a thousandth of
    a credit. Progress at execution determines the refund. A captured
    construction order returns no credits; an order invalidated before execution
    returns its reservation.
  </p>
  <h3>Completion and markets</h3>
  <p>
    Read the settled outcome before spending a refund or counting a completed
    development. Completion dividends use markets and their focus at the
    beginning of the tick. Newly completed markets join those dividend weights
    on the following tick.
  </p>
</details>

<style>
  .construction-rules {
    border: 1px solid #466573;
    margin: 16px 0;
    background: #0b202c;
    line-height: 1.5;
  }
  summary {
    min-height: 44px;
    padding: 12px;
    cursor: pointer;
    color: #bceff2;
    font-weight: 700;
  }
  summary:focus-visible {
    outline: 3px solid #e9cb85;
    outline-offset: -3px;
  }
  h3,
  p {
    margin: 12px;
  }
  h3 {
    font-size: 1.1em;
    color: #e9cb85;
  }
  .scope {
    color: #bceff2;
  }
  @media (min-width: 2300px) {
    summary {
      min-height: 64px;
    }
  }
</style>
