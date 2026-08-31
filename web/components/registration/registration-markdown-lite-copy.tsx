import {
  splitMarkdownLiteParagraphs,
} from "@/lib/markdown-lite-copy";

type RegistrationMarkdownLiteCopyProps = {
  copy: string;
  className?: string;
  paragraphClassName?: string;
};

export function RegistrationMarkdownLiteCopy({
  copy,
  className,
  paragraphClassName = "text-sm leading-relaxed text-text-muted-warm",
}: RegistrationMarkdownLiteCopyProps) {
  const paragraphs = splitMarkdownLiteParagraphs(copy);
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          className={paragraphClassName}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
