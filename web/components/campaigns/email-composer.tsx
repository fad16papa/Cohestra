"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  QrCode,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { InsertQrModal } from "@/components/campaigns/insert-qr-modal";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/activities-api";
import {
  CAMPAIGN_HTML_MAX_BYTES,
  createCampaignAssetFromActivityQr,
  getHtmlByteSize,
  uploadCampaignAsset,
} from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

type EmailComposerProps = {
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  activities: Activity[];
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  communityFilter?: string;
};

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-transparent text-text-muted-warm transition-colors hover:bg-muted/60 hover:text-text-warm disabled:opacity-40",
        active && "border-border-warm bg-muted/60 text-text-warm"
      )}
    >
      {children}
    </button>
  );
}

export function EmailComposer({
  authFetch,
  activities,
  value,
  onChange,
  placeholder = "Write your email message…",
  className,
  communityFilter,
}: EmailComposerProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlSize = getHtmlByteSize(value);
  const sizeWarning = htmlSize > CAMPAIGN_HTML_MAX_BYTES;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-56 px-4 py-3 text-sm text-text-warm focus:outline-none [&_a]:text-primary [&_a]:underline [&_img]:my-3 [&_img]:max-h-64 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  async function handleImageUpload(file: File) {
    if (!editor) {
      return;
    }

    const altText = window.prompt("Alt text for this image (recommended):", file.name) ?? "";
    setUploading(true);

    try {
      const asset = await uploadCampaignAsset(authFetch, file, altText);
      editor
        .chain()
        .focus()
        .setImage({
          src: asset.url,
          alt: asset.altText ?? (altText || "Campaign image"),
        })
        .run();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInsertQr(activityId: string, altText: string) {
    if (!editor) {
      return;
    }

    setUploading(true);
    try {
      const asset = await createCampaignAssetFromActivityQr(authFetch, activityId, altText);
      editor
        .chain()
        .focus()
        .setImage({ src: asset.url, alt: asset.altText ?? altText })
        .run();
      setQrOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not insert QR code.");
    } finally {
      setUploading(false);
    }
  }

  function handleSetLink() {
    if (!editor) {
      return;
    }

    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) {
      return;
    }

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  if (!editor) {
    return (
      <div className={cn("rounded-lg border border-border-warm bg-background p-4", className)}>
        <p className="text-sm text-text-muted-warm">Loading editor…</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("overflow-hidden rounded-lg border border-border-warm bg-background", className)}>
        <div className="flex flex-wrap items-center gap-1 border-b border-border-warm bg-muted/20 px-2 py-2">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-6 w-px bg-border-warm" aria-hidden />
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-6 w-px bg-border-warm" aria-hidden />
          <ToolbarButton label="Insert link" onClick={handleSetLink}>
            <Link2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Insert image"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Insert activity QR" disabled={uploading} onClick={() => setQrOpen(true)}>
            <QrCode className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-6 w-px bg-border-warm" aria-hidden />
          <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>

        <EditorContent editor={editor} />

        <div className="flex items-center justify-between border-t border-border-warm bg-muted/10 px-3 py-2 text-xs text-text-muted-warm">
          <span>{uploading ? "Uploading…" : "Rich HTML email"}</span>
          <span className={cn(sizeWarning && "font-medium text-destructive")}>
            {Math.ceil(htmlSize / 1024)}KB / {Math.ceil(CAMPAIGN_HTML_MAX_BYTES / 1024)}KB
          </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImageUpload(file);
          }
          event.target.value = "";
        }}
      />

      <InsertQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        activities={activities}
        communityFilter={communityFilter}
        onInsert={(activityId, altText) => void handleInsertQr(activityId, altText)}
      />
    </>
  );
}

export function isEmailComposerEmpty(html: string): boolean {
  const stripped = html
    .replace(/<p><\/p>/g, "")
    .replace(/<p><br><\/p>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  return stripped.length === 0;
}
