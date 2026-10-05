export function resolveDropIndexFromPoint(
  clientX: number,
  clientY: number,
  attribute: string
): number | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.elementFromPoint(clientX, clientY);
  const row = element?.closest(`[${attribute}]`);
  if (!row) {
    return null;
  }

  const parsed = Number.parseInt(row.getAttribute(attribute) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function shouldStartHandlePointerDrag(
  pointerType: string,
  button: number,
  disabled: boolean
): boolean {
  if (disabled || button !== 0) {
    return false;
  }

  return pointerType === "touch" || pointerType === "pen";
}

export const FORM_STUDIO_ROW_INDEX_ATTR = "data-form-studio-row-index";
export const BUILDER_REORDER_HANDLE_ATTR = "data-builder-reorder-handle";
