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

type EmailPreviewDialogProps = {
  open: boolean;
  subject: string;
  html: string;
  onClose: () => void;
};

export function EmailPreviewDialog({
  open,
  subject,
  html,
  onClose,
}: EmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border-warm px-5 py-4">
          <DialogTitle id="email-preview-title" className="text-sm">
            Email preview
          </DialogTitle>
          <DialogDescription>
            Subject: <span className="text-text-warm">{subject.trim() || "(No subject)"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto bg-white p-6 text-black">
          <div
            className="mx-auto max-w-xl text-sm leading-relaxed [&_a]:text-blue-700 [&_a]:underline [&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <DialogFooter className="border-t border-border-warm px-5 py-4">
          <DialogClose
            render={<Button type="button" variant="outline" />}
          >
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
