import rules from "../rules/cluster-v0.1.0.json" with { type: "json" };
export { rules };
export type FactionId = "pelagic" | "heliac" | "vesper" | "dracon";
export type StarClass = "M" | "G" | "A" | "O";
export function faction(id: string) {
  const found = rules.factions.find((item) => item.id === id);
  if (!found) throw new Error("Unknown faction");
  return found;
}
