<script lang="ts">
  import { rules } from "@shared/rules";
</script>

<details class="market-rules">
  <summary>Market focus rules</summary>
  <p class="scope">
    The campaign continues. Market dividend rules remain under review.
  </p>
  <h3>Allocate expectations</h3>
  <p>
    Distribute exactly {rules.focusPoints} whole points across markets, training camps,
    bases and space stations. Zero is allowed. Editing these points spends no credits
    and changes no confirmed allocation. Apply focus requests an order; wait for acceptance.
  </p>
  <h3>Read the scheduled outcome</h3>
  <p>
    An accepted order records its application tick. Dividends use the allocation
    from the beginning of each tick, so a changed allocation first affects the
    following tick. Multiple orders due together apply in accepted order; the
    last allocation becomes current. Pauses delay progress. Reload recovers
    accepted orders.
  </p>
  <h3>Share a dividend pool</h3>
  <p>
    Other empires’ completed developments contribute {rules.marketDividendFraction *
      100}% of their paid construction price to a shared pool. Each eligible
    system’s weight is its beginning-of-tick market count multiplied by its
    focus on that development type. The pool is divided by those weights; it is
    not a guaranteed credit per point. Your own builds never pay your markets.
  </p>
  <h3>Confirmed and held returns</h3>
  <p>
    New markets join dividend weights from the next tick. A system must retain
    its surface owner through settlement to receive a share. When orbit and
    surface are split, returns stay held at the system instead of becoming
    spendable credits. Read confirmed income and held credits separately; other
    players’ future building choices remain uncertain.
  </p>
</details>

<style>
  .market-rules {
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
