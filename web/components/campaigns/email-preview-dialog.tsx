"use client";

import { Button } from "@/components/ui/button";

type EmailPreviewDialogProps = {
  open: boolean;
  subject: string;
  html: string;
  onClose: () => void;
};

export function EmailPreviewDialog({ open, subject, html, onClose }: EmailPreviewDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-preview-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-warm bg-card shadow-xl"
      >
        <div className="border-b border-border-warm px-5 py-4">
          <h3 id="email-preview-title" className="text-sm font-semibold text-text-warm">
            Email preview
          </h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Subject: <span className="text-text-warm">{subject.trim() || "(No subject)"}</span>
          </p>
        </div>

        <div className="overflow-y-auto bg-white p-6 text-black">
          <div
            className="mx-auto max-w-xl text-sm leading-relaxed [&_a]:text-blue-700 [&_a]:underline [&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <div className="flex justify-end border-t border-border-warm px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
