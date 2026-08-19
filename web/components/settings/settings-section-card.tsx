import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SettingsSectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSectionCard({
  id,
  title,
  description,
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <Card
      id={id}
      className={cn(
        "scroll-mt-24 border-border-warm/80 bg-card/80 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <CardHeader className="space-y-1 pb-4">
        <h2 className="font-heading text-base font-semibold leading-snug text-text-warm">
          {title}
        </h2>
        {description ? (
          <CardDescription className="text-sm leading-relaxed text-text-muted-warm">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-8 pt-0">{children}</CardContent>
    </Card>
  );
}
