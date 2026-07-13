import Link from "next/link";

type ClientMergeSuspectBannerProps = {
  className?: string;
};

export function ClientMergeSuspectBanner({ className }: ClientMergeSuspectBannerProps) {
  return (
    <div
      role="status"
      className={
        className ??
        "rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm"
      }
    >
      Possible duplicate — review suggested.{" "}
      <Link
        href="/clients?mergeSuspect=true"
        className="font-medium text-text-warm underline-offset-4 hover:underline"
      >
        View merge-suspect clients
      </Link>
    </div>
  );
}
