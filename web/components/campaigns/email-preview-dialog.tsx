"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sanitizeCampaignHtml } from "@/lib/campaign-html";

type EmailPreviewDialogProps = {
  open: boolean;
  subject: string;
  html: string;
  recipientCount?: number | null;
  onClose: () => void;
};

export function EmailPreviewDialog({
  open,
  subject,
  html,
  recipientCount = null,
  onClose,
}: EmailPreviewDialogProps) {
  const safeHtml = sanitizeCampaignHtml(html);
  const audience =
    recipientCount === null
      ? "Recipients with consent and email will receive this exact subject and message."
      : recipientCount === 0
        ? "No consented recipients with email are selected yet. This is the message they would receive."
        : `This is the message ${recipientCount} consented recipient${recipientCount === 1 ? "" : "s"} will receive.`;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[min(42rem,calc(100vw-1.5rem))] min-w-0 max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border-warm px-5 py-4">
          <DialogTitle id="email-preview-title" className="text-sm">
            Email preview
          </DialogTitle>
          <DialogDescription>
            {audience} Subject:{" "}
            <span className="text-text-warm">{subject.trim() || "(No subject)"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 overflow-x-auto overflow-y-auto bg-white p-6 text-black">
          <div
            className="mx-auto max-w-full text-sm leading-relaxed break-words [&_a]:text-blue-700 [&_a]:underline [&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </div>

        <DialogFooter className="border-t border-border-warm px-5 py-4">
          <DialogClose
            render={<Button type="button" variant="outline" className="min-h-12 min-w-11 px-4" />}
          >
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
