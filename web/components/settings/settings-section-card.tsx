import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SettingsSectionCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <Card className={cn("border-border-warm", className)}>
      <CardHeader className="border-b border-border-warm">
        <h2 className="font-heading text-base leading-snug font-medium text-section text-text-warm">
          {title}
        </h2>
        <CardDescription className="text-text-muted-warm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">{children}</CardContent>
    </Card>
  );
}
