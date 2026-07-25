import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { PublisherWebsiteLink } from "@/lib/publisher-website-url";
import { cn } from "@/lib/utils";

type PublisherWebsiteLinkButtonProps = {
  link: PublisherWebsiteLink;
  className?: string;
};

export function PublisherWebsiteLinkButton({
  link,
  className,
}: PublisherWebsiteLinkButtonProps) {
  const classNames = cn(
    buttonVariants({ variant: "default", size: "lg" }),
    "w-full min-h-11 gap-2 px-4",
    className
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        title={link.title}
        className={classNames}
      >
        <span className="truncate">{link.label}</span>
        <ExternalLink className="size-4 shrink-0" aria-hidden />
      </a>
    );
  }

  return (
    <Link href={link.href} title={link.title} className={classNames}>
      <span className="truncate">{link.label}</span>
      <ExternalLink className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

type PublisherWebsiteTextLinkProps = {
  link: PublisherWebsiteLink;
  className?: string;
};

export function PublisherWebsiteTextLink({
  link,
  className,
}: PublisherWebsiteTextLinkProps) {
  const classNames = cn(
    "inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80",
    className
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        title={link.title}
        className={classNames}
      >
        <span className="truncate">{link.label}</span>
        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      </a>
    );
  }

  return (
    <Link href={link.href} title={link.title} className={classNames}>
      <span className="truncate">{link.label}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </Link>
  );
}
