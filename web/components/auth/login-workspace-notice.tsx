type LoginWorkspaceNoticeProps = {
  workspaceLabel: string;
  host: string;
};

export function LoginWorkspaceNotice({
  workspaceLabel,
  host,
}: LoginWorkspaceNoticeProps) {
  return (
    <div
      className="mb-6 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-left text-sm text-text-muted-warm"
      role="status"
    >
      <p className="font-medium text-text-warm">
        {workspaceLabel} operator workspace
      </p>
      <p className="mt-1 text-xs leading-relaxed">
        You are signing in at{" "}
        <span className="font-medium text-text-warm">{host}</span>. This URL is
        your workspace address and stays the same after Docker or server
        restarts — it is not reset when you rebuild containers.
      </p>
    </div>
  );
}
