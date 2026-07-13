import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthFlowShell
      eyebrow="Email verification"
      title="Check your inbox"
      description="Enter the 6-digit code we sent to confirm this email belongs to you."
    >
      <VerifyEmailForm />
    </AuthFlowShell>
  );
}
