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
      className="mb-6 rounded-[12px] border border-lagoon/25 bg-lagoon/[0.05] px-4 py-3 text-left text-sm"
      role="status"
    >
      <p className="font-medium text-ink">{workspaceLabel} workspace</p>
      <p className="mt-1 text-xs leading-relaxed text-stone">
        Signing in at <span className="font-medium text-ink">{host}</span>. This URL is your
        workspace address and stays the same after restarts or rebuilds.
      </p>
    </div>
  );
}
