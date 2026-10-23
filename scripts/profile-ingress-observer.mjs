import { Server } from "node:http";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";

const loopback = (address) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
const tag = (kind, value) =>
  createHash("sha256").update(`${kind}\0${value}`).digest("hex");

// RTDB GCFEmulatorPublisher uses FunctionPayload.namespace in this URL,
// rather than the project ID. Accept only this project's explicit demo namespace.
export const isProfileIngressRoute = (url) =>
  /^\/functions\/projects\/demo-clusterii(?:-default-rtdb)?\/triggers\/us-central1-processProfile(?:-\d+)?$/.test(
    url,
  );

// Binary CloudEvent metadata only. Never inspect/consume the body or log headers.
export function profileIngressTags(headers) {
  const id = headers["ce-id"],
    ref = headers["ce-ref"];
  return {
    ...(typeof id === "string" && id.length > 0 && id.length <= 1024
      ? { eventTag: tag("profile-event", id) }
      : {}),
    ...(typeof ref === "string" &&
    /^\/?profileCommands\/[^/]{1,128}\/[^/]{1,128}\/?$/.test(ref)
      ? { commandTag: tag("profile-command", ref.replace(/^\/|\/$/g, "")) }
      : {}),
  };
}

export function installProfileIngressObserver({
  output,
  port = 15001,
  limit = 512,
}) {
  if (
    !output ||
    !Number.isInteger(port) ||
    port <= 0 ||
    !Number.isInteger(limit) ||
    limit < 1
  )
    throw new Error("Invalid ingress observer configuration");
  const descriptor = Object.getOwnPropertyDescriptor(Server.prototype, "emit");
  const native = Server.prototype.emit;
  let records = 0,
    sequence = 0,
    disabled = false;
  const coverage = {
    status: "active",
    listening: "unobserved",
    requests: 0,
    matched: 0,
    nonLoopback: 0,
    nonPost: 0,
    otherRoute: 0,
  };
  const status = () => {
    try {
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(`${output}.status.json`, JSON.stringify(coverage) + "\n");
    } catch {
      disabled = true;
      process.stderr.write("Profile ingress diagnostics unavailable\n");
    }
  };
  status();
  const emit = (event) => {
    if (disabled || records > limit) return;
    try {
      mkdirSync(dirname(output), { recursive: true });
      appendFileSync(
        output,
        JSON.stringify(records++ === limit ? { event: "limit" } : event) + "\n",
      );
    } catch {
      disabled = true;
      // Diagnostic I/O cannot change the original HTTP request/result.
      process.stderr.write("Profile ingress diagnostics unavailable\n");
    }
  };
  Server.prototype.emit = function (event, ...args) {
    if (event === "listening") {
      const address = this.address();
      if (typeof address === "object" && address?.port === port) {
        coverage.listening = loopback(address.address)
          ? "loopback"
          : "other-address";
        status();
      }
    }
    const [req, res] = args;
    if (
      event === "request" &&
      req.socket.localPort === port &&
      coverage.requests <= limit
    ) {
      coverage.requests++;
      if (
        !loopback(req.socket.localAddress) ||
        !loopback(req.socket.remoteAddress)
      )
        coverage.nonLoopback++;
      else if (req.method !== "POST") coverage.nonPost++;
      else if (!isProfileIngressRoute(req.url)) coverage.otherRoute++;
      else coverage.matched++;
      if (coverage.requests > limit) coverage.status = "coverage-limit";
      status();
    }
    if (
      event === "request" &&
      req.method === "POST" &&
      req.socket.localPort === port &&
      loopback(req.socket.localAddress) &&
      loopback(req.socket.remoteAddress) &&
      isProfileIngressRoute(req.url)
    ) {
      const sequenceId = ++sequence,
        started = performance.now();
      const tags = profileIngressTags(req.headers);
      let completed = false;
      emit({ event: "http-arrived", sequence: sequenceId, ...tags });
      res.once("finish", () => {
        completed = true;
        emit({
          event: "http-finished",
          sequence: sequenceId,
          ...tags,
          elapsedMs: performance.now() - started,
          status: res.statusCode,
        });
      });
      res.once("close", () => {
        if (!completed)
          emit({
            event: "http-closed",
            sequence: sequenceId,
            ...tags,
            elapsedMs: performance.now() - started,
          });
      });
    }
    return native.call(this, event, ...args);
  };
  return () => {
    if (descriptor) Object.defineProperty(Server.prototype, "emit", descriptor);
    else delete Server.prototype.emit;
  };
}

// Only the explicit test CLI process installs this hook, not application workers.
if (
  process.env.CLUSTER_PROFILE_INGRESS_DIAGNOSTICS === "1" &&
  process.argv.includes("emulators:exec")
) {
  const project = process.argv.indexOf("--project");
  if (project < 0 || process.argv[project + 1] !== "demo-clusterii")
    throw new Error("Ingress observer requires the explicit demo project");
  installProfileIngressObserver({
    output: process.env.CLUSTER_PROFILE_INGRESS_LOG,
  });
}
