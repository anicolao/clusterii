<script lang="ts">
  let {
    value = $bindable(""),
    disabled = false,
    invalid = false,
    errorId,
    id = "alias",
  }: {
    value?: string;
    disabled?: boolean;
    invalid?: boolean;
    errorId?: string;
    id?: string;
  } = $props();
</script>

<label for={id}>Commander name</label>
<input
  {id}
  bind:value
  minlength="2"
  maxlength="48"
  required
  autocomplete="nickname"
  {disabled}
  aria-invalid={invalid}
  aria-describedby={errorId}
/>

<style>
  label {
    display: block;
    color: #e1d5bf;
    font-size: 14px;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
  }
</style>
