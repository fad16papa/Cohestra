import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthFlowShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Enter the reset code from your email and set a new password for your workspace."
    >
      <ResetPasswordForm />
    </AuthFlowShell>
  );
}
