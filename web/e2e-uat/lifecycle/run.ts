import { writeFileSync } from "node:fs";
import { runLifecycle, EXIT } from "./harness.ts";

const result = await runLifecycle(process.env);
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `needs_bootstrap=${result.code === EXIT.needsBootstrap ? "true" : "false"}\n`,
      `result=${result.evidence.result}\n`,
      `owner_gate=${result.evidence.ownerGate ?? "none"}\n`,
    ].join(""),
    { flag: "a" },
  );
}

if (result.evidence.ownerGate) {
  console.log(`OWNER_GATE=${result.evidence.ownerGate}`);
} else if (result.evidence.result === "skip") {
  console.log(`SKIP: ${result.evidence.reason}`);
} else {
  console.log(`LIFECYCLE=${result.evidence.result.toUpperCase()}`);
}

process.exit(result.code);
