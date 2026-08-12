type RegistrationIntroCopyProps = {
  introMarkdown: string;
  className?: string;
};

function sanitizeIntroMarkdown(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function RegistrationIntroCopy({
  introMarkdown,
  className,
}: RegistrationIntroCopyProps) {
  const sanitized = sanitizeIntroMarkdown(introMarkdown);
  if (!sanitized) {
    return null;
  }

  const paragraphs = sanitized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          className="text-sm leading-relaxed text-text-muted-warm"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
