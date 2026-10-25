// Cohestra credential-free mock policy. No live Cursor or GitHub requests.
export const IMPACT_FIELDS = Object.freeze(["architecture","authentication","authorization","tenantIsolation","billing","dataSchema","secrets","infrastructure","production","uat","ciCd","externalApi","publicContract"]);
const TYPES = ["planning","feature","security_review","release_review","simple_bug_fix"];
const SENSITIVE = [
  /^\.github\//i, /^deploy\//i, /^_bmad\/custom\//i,
  /^_bmad-output\/planning-artifacts\/architecture\//i,
  /^_bmad-output\/planning-artifacts\/autonomous-/i,
  /^docker-compose\.(?:uat|production|prod)\.ya?ml$/i,
  /(^|\/)(?:auth|authentication|authorization|jwt|tenant|paddle|billing|webhook|migrations?|secrets?|security|production|uat|recaptcha|cors)(\/|[._-])/i,
  /provenance|productionsecurityvalidator/i,
];
export function normalizePath(p) {
  if (typeof p !== "string") return null;
  const v=p.trim().replaceAll("\\","/");
  return !v || v.startsWith("/") || v.includes(":") || v.includes("//") ||
    /(^|\/)\.\.?($|\/)/.test(v) || /[\r\n\0]/.test(v) ? null : v;
}
export function isSensitivePath(p) {
  const v=normalizePath(p);
  return v===null || SENSITIVE.some(re=>re.test(v));
}
export function evaluate(input) {
  const issues=[];
  if (!input || typeof input!=="object" || Array.isArray(input)) return {
    verdict:"HOLD",issues:["INVALID_CONTRACT"],liveEnabled:false};
  const fields=["version","taskId","repo","sha","kind","selectedModel","paths","impact","reviewCycles"];
  if (Object.keys(input).some(k=>!fields.includes(k))) issues.push("UNTRUSTED_CONTRACT_FIELD");
  if (input.version!==1) issues.push("UNKNOWN_SCHEMA");
  if (typeof input.taskId!=="string" || !/^[A-Z][A-Z0-9-]{4,63}$/.test(input.taskId)) issues.push("BAD_TASK_ID");
  if (input.repo!=="fad16papa/Cohestra") issues.push("WRONG_REPOSITORY");
  if (typeof input.sha!=="string" || !/^[0-9a-f]{40}$/.test(input.sha)) issues.push("UNPINNED_HEAD");
  if (!TYPES.includes(input.kind)) issues.push("UNKNOWN_TASK_KIND");
  const expected=input.kind==="simple_bug_fix"?"composer-2.5":"grok-4.6";
  if (input.selectedModel!==expected) issues.push("ASSIGNED_MODEL_MISMATCH");
  if (!Number.isInteger(input.reviewCycles) || input.reviewCycles<1 || input.reviewCycles>3) issues.push("UNBOUNDED_REVIEW");
  if (!Array.isArray(input.paths) || input.paths.length<1 || input.paths.length>50) issues.push("UNKNOWN_PATH_SCOPE");
  else {
    if (input.paths.some(p=>normalizePath(p)===null)) issues.push("INVALID_PATH");
    if (input.paths.some(isSensitivePath)) issues.push("SENSITIVE_PATH_OWNER_GATE");
    if (input.kind==="simple_bug_fix" && input.paths.length>3) issues.push("COMPOSER_SCOPE_TOO_LARGE");
  }
  if (!input.impact || typeof input.impact!=="object" || Array.isArray(input.impact)) issues.push("NO_IMPACT_RECORD");
  else if (Object.keys(input.impact).length!==IMPACT_FIELDS.length ||
      IMPACT_FIELDS.some(k=>typeof input.impact[k]!=="boolean")) issues.push("UNKNOWN_IMPACT");
  else if (IMPACT_FIELDS.some(k=>input.impact[k])) issues.push("MATERIAL_IMPACT_OWNER_GATE");
  // This result is never a trusted approval. Authentication belongs to a future protected dispatcher.
  return {
    verdict:issues.length?"HOLD":"MOCK_ELIGIBLE",issues:[...new Set(issues)].sort(),
    liveEnabled:false,ownerApproved:false,modelCatalogVerified:false,
    internalHelperModels:"NOT_ATTESTED",primaryModel:issues.includes("ASSIGNED_MODEL_MISMATCH")?"INVALID":expected
  };
}
