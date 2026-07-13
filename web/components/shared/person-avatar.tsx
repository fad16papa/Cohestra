import { getInitials } from "@/lib/display-name";
import { cn } from "@/lib/utils";

type PersonAvatarProps = {
  name: string;
  className?: string;
  size?: "sm" | "md";
};

export function PersonAvatar({ name, className, size = "md" }: PersonAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
