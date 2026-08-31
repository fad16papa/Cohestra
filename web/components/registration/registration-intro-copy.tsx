import { RegistrationMarkdownLiteCopy } from "@/components/registration/registration-markdown-lite-copy";

type RegistrationIntroCopyProps = {
  introMarkdown: string;
  className?: string;
};

export function RegistrationIntroCopy({
  introMarkdown,
  className,
}: RegistrationIntroCopyProps) {
  return (
    <RegistrationMarkdownLiteCopy
      copy={introMarkdown}
      className={className}
      paragraphClassName="text-sm leading-relaxed text-text-muted-warm"
    />
  );
}
