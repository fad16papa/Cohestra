import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminPlaceholderProps = {
  title: string;
  description: string;
};

export function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <Card className="border-border-warm">
      <CardHeader>
        <CardTitle className="text-display-sm text-text-warm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-text-muted-warm">
        Placeholder screen — feature content ships in later epics.
      </CardContent>
    </Card>
  );
}
