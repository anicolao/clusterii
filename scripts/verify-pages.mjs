const [base, expected] = process.argv.slice(2);
if (!base || !/^[a-f0-9]{40}$/.test(expected ?? ""))
  throw new Error("Preview URL and source SHA required");
let matched = false;
for (let attempt = 0; attempt < 90; attempt++) {
  const response = await fetch(
    new URL(`revision.json?source=${expected}`, base),
    { cache: "no-store" },
  );
  if (response.ok) {
    const revision = await response.json();
    if (
      revision.sourceSha === expected &&
      revision.buildSourceSha === expected
    ) {
      matched = true;
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!matched)
  throw new Error("Hosted revision did not match the published source");
const entry = await fetch(base);
if (!entry.ok) throw new Error("Entry route unavailable");
const html = await entry.text();
const assets = new Set(
  [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(
    (match) => new URL(match[1], base).href,
  ),
);
for (const path of [
  "diagnostics/",
  "art/entry-phone.webp",
  "art/portraits.webp",
])
  assets.add(new URL(path, base).href);
for (const url of assets) {
  if (!url.startsWith(base)) continue;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Missing published asset: ${url}`);
}
console.log(
  `Verified ${expected}: entry, diagnostics, and ${assets.size} static asset references at ${base}`,
);
