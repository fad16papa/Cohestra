import { spawnSync } from "node:child_process";
import path from "node:path";

const REQUIRED = [
  "UAT_OTP_MAILBOX_HOST",
  "UAT_OTP_MAILBOX_USER",
  "UAT_OTP_MAILBOX_SECRET",
] as const;

const PERSONAL = /@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud)\./i;

export function mailboxSecretsPresent(): boolean {
  return REQUIRED.every((name) => Boolean(process.env[name]?.trim()));
}

export function assertDedicatedMailboxAddress(address: string): void {
  if (PERSONAL.test(address)) {
    throw new Error("personal mailbox credentials are forbidden");
  }
}

export function readSignupOtp(options: { to: string; subject?: string }): string {
  assertDedicatedMailboxAddress(options.to);
  if (!mailboxSecretsPresent()) {
    throw new Error("UAT OTP mailbox secrets are not configured");
  }

  const script = path.resolve(process.cwd(), "..", "deploy", "uat-otp-mailbox.sh");
  const args = ["--poll", "--to", options.to];
  if (options.subject) {
    args.push("--subject", options.subject);
  }

  const result = spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: process.env,
  });

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/BEGIN (OPENSSH |RSA )?PRIVATE KEY|UAT_OTP_MAILBOX_SECRET=/.test(combined)) {
    throw new Error("mailbox reader leaked secret material");
  }

  const match = (result.stdout ?? "").match(/^OTP_CODE=(\d{6})$/m);
  if (result.status !== 0 || !match) {
    throw new Error("dedicated mailbox did not return a matching OTP");
  }
  return match[1];
}
