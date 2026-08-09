import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
        <CardTitle className="text-section text-text-warm">{title}</CardTitle>
        <CardDescription className="text-text-muted-warm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">{children}</CardContent>
    </Card>
  );
}
