#!/usr/bin/env node
// Offline demonstration. Does not use fetch, curl, GitHub Actions or API keys.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {evaluate} from "./policy.mjs";
export function newMockDispatcher() {
  const keys=new Set(),occupied=new Set();
  return {
    submit(data) {
      const result=evaluate(data);
      if (result.verdict!=="MOCK_ELIGIBLE") return result;
      const key=createHash("sha256").update(data.repo+"\n"+data.taskId+"\n"+data.sha).digest("hex");
      if (keys.has(key)) return {verdict:"HOLD",issues:["DUPLICATE_TASK"],liveEnabled:false};
      if (occupied.has(data.sha)) return {verdict:"HOLD",issues:["HEAD_OCCUPIED"],liveEnabled:false};
      keys.add(key);occupied.add(data.sha);
      return {...result,verdict:"MOCK_ACCEPTED_NO_DISPATCH",idempotencyKey:key,
        endpoint:"NOT_CALLED",ownerGate:"NOT_VERIFIED",cursorModelId:"UNRESOLVED",
        maxReviewCycles:data.reviewCycles};
    }
  };
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if (process.argv[2]!=="mock" || !process.argv[3]) {
    process.stderr.write("Usage: node dispatch.mjs mock <contract.json>\n");process.exitCode=2;
  } else {
    try {
      const raw=readFileSync(process.argv[3],"utf8");
      if (Buffer.byteLength(raw)>65536) throw Error("EXCESS_SIZE");
      const result=newMockDispatcher().submit(JSON.parse(raw));
      // Never echo raw contract fields, user text, or credentials.
      process.stdout.write(JSON.stringify(result,null,2)+"\n");
      if (result.verdict!=="MOCK_ACCEPTED_NO_DISPATCH") process.exitCode=1;
    } catch {
      process.stderr.write("INVALID_OR_UNREADABLE_CONTRACT\n");process.exitCode=1;
    }
  }
}
