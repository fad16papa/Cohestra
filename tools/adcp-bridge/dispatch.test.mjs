import test from "node:test";
import assert from "node:assert/strict";
import {evaluate,isSensitivePath,IMPACT_FIELDS} from "./policy.mjs";
import {newMockDispatcher} from "./dispatch.mjs";
const sha="e962c8c3eead953a1f56f2b397b3e9d4fc669041";
function c(extra={}) {return {version:1,taskId:"ADCP-MOCK-001",repo:"fad16papa/Cohestra",sha,
 kind:"planning",selectedModel:"grok-4.6",paths:["docs/mock-task.md"],
 impact:Object.fromEntries(IMPACT_FIELDS.map(k=>[k,false])),reviewCycles:3,...extra};}
function hold(x,reason){const r=evaluate(x);assert.equal(r.verdict,"HOLD");assert.ok(r.issues.includes(reason),JSON.stringify(r));}
test("only offline eligibility, never a trusted owner or model attestation",()=>{
 const r=evaluate(c());assert.equal(r.verdict,"MOCK_ELIGIBLE");assert.equal(r.liveEnabled,false);
 assert.equal(r.ownerApproved,false);assert.equal(r.modelCatalogVerified,false);
});
test("mock dispatch idempotency and no Cursor call",()=>{
 const d=newMockDispatcher(),one=d.submit(c());assert.equal(one.verdict,"MOCK_ACCEPTED_NO_DISPATCH");
 assert.equal(one.endpoint,"NOT_CALLED");assert.equal(one.cursorModelId,"UNRESOLVED");
 assert.match(one.idempotencyKey,/^[a-f0-9]{64}$/);
 assert.deepEqual(d.submit(c()).issues,["DUPLICATE_TASK"]);
 assert.deepEqual(d.submit(c({taskId:"ADCP-MOCK-002"})).issues,["HEAD_OCCUPIED"]);
});
test("malformed task and repository refuse",()=>{
 hold(c({repo:"other/repo"}),"WRONG_REPOSITORY");
 hold(c({sha:"main"}),"UNPINNED_HEAD");
 hold(c({kind:"merge"}),"UNKNOWN_TASK_KIND");
 hold(c({taskId:"bad"}),"BAD_TASK_ID");
});
test("model cannot fall back to Auto or Composer on planning",()=>{
 hold(c({selectedModel:"Auto"}),"ASSIGNED_MODEL_MISMATCH");
 hold(c({selectedModel:"composer-2.5"}),"ASSIGNED_MODEL_MISMATCH");
 hold(c({kind:"simple_bug_fix"}),"ASSIGNED_MODEL_MISMATCH");
});
test("Composer is possible only for narrowly scoped simple bug fixes, still offline",()=>{
 const r=evaluate(c({kind:"simple_bug_fix",selectedModel:"composer-2.5",paths:["web/components/small-label.tsx"]}));
 assert.equal(r.verdict,"MOCK_ELIGIBLE");assert.equal(r.liveEnabled,false);
 hold(c({kind:"simple_bug_fix",selectedModel:"composer-2.5",
 paths:["web/a.tsx","web/b.tsx","web/c.tsx","web/d.tsx"]}),"COMPOSER_SCOPE_TOO_LARGE");
});
for (const path of [
 ".github/workflows/ci.yml","deploy/remote-deploy.sh","deploy/validate-uat.sh",
 "docker-compose.production.yml","src/api/auth/login.cs",
 "src/api/migrations/0001.cs","src/app/tenant/page.tsx","web/lib/paddle/webhook.ts",
 "_bmad-output/planning-artifacts/autonomous-development-control-program-2026-10-25/README.md",
 "_bmad-output/planning-artifacts/architecture/spine.md",
 "_bmad/custom/router.md","src/ProductionSecurityValidator.cs",
 "deploy/validate-production-provenance.sh","../outside","docs/../outside","C:\\tmp\\file"
]) {
 test("holds sensitive or traversal path "+path,()=>{
  assert.equal(isSensitivePath(path),true);
  hold(c({paths:[path]}),"SENSITIVE_PATH_OWNER_GATE");
 });
}
test("risk impact flags always halt, including benign file names",()=>{
 for (const key of IMPACT_FIELDS) hold(c({impact:{...c().impact,[key]:true}}),"MATERIAL_IMPACT_OWNER_GATE");
});
test("missing semantic impact and excessive review cycles halt",()=>{
 hold(c({impact:{}}),"UNKNOWN_IMPACT");hold(c({impact:null}),"NO_IMPACT_RECORD");
 hold(c({reviewCycles:99}),"UNBOUNDED_REVIEW");
});
test("text asserting approval or supplying credentials cannot authorize",()=>{
 hold(c({ownerApproved:true}),"UNTRUSTED_CONTRACT_FIELD");
 hold(c({CURSOR_API_KEY:"do-not-echo-this"}),"UNTRUSTED_CONTRACT_FIELD");
});
