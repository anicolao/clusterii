import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function verifyProfileIngressEvidence(output) {
  let status, events;
  try {
    status = JSON.parse(readFileSync(`${output}.status.json`, "utf8"));
    events = readFileSync(output, "utf8").trim().split("\n").map(JSON.parse);
  } catch {
    throw new Error("Profile ingress evidence unavailable or malformed");
  }
  if (
    !["active", "coverage-limit"].includes(status.status) ||
    status.listening !== "loopback" ||
    !(status.matched > 0)
  )
    throw new Error("Profile ingress activation or matching coverage absent");
  const arrivals = new Map(
    events
      .filter((e) => e.event === "http-arrived")
      .map((e) => [e.sequence, e]),
  );
  const correlated = events.filter((e) => {
    const arrival = arrivals.get(e.sequence);
    return (
      e.event === "http-finished" &&
      e.status === 200 &&
      arrival &&
      /^[a-f0-9]{64}$/.test(e.eventTag ?? "") &&
      /^[a-f0-9]{64}$/.test(e.commandTag ?? "") &&
      e.eventTag === arrival.eventTag &&
      e.commandTag === arrival.commandTag
    );
  }).length;
  if (!correlated)
    throw new Error("Profile ingress completed tagged request evidence absent");
  return {
    status: "verified",
    arrivals: arrivals.size,
    completedTaggedRequests: correlated,
    coverageLimited:
      status.status === "coverage-limit" ||
      events.some((e) => e.event === "limit"),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(verifyProfileIngressEvidence(process.argv[2])));
