import { isProPlan } from "@/lib/shell/tenant-shell-api";

export type WebsiteBuilderEditorTab = "design" | "sections" | "templates";

export type WebsiteBuilderTourStep = {
  id: string;
  title: string;
  body: string;
  tab?: WebsiteBuilderEditorTab;
  targetSelector: string;
  placement?: "top" | "bottom" | "left" | "right";
  proOnly?: boolean;
};

const BASE_TOUR_STEPS: WebsiteBuilderTourStep[] = [
  {
    id: "templates",
    title: "Start with a template",
    body: "Pick a built-in layout or save your own. Templates set up sections so you are not staring at a blank page.",
    tab: "templates",
    targetSelector: "#website-builder-tab-templates",
    placement: "bottom",
  },
  {
    id: "branding",
    title: "Name and brand your site",
    body: "Set your site name, logo, and accent color. These appear on your public homepage after you publish.",
    tab: "design",
    targetSelector: "#website-branding-section",
    placement: "right",
  },
  {
    id: "preview",
    title: "Preview as you edit",
    body: "Your draft updates here in real time. Switch between phone and desktop, or expand to fullscreen.",
    targetSelector: '[data-site-preview-pane]',
    placement: "left",
  },
  {
    id: "publish",
    title: "Publish when ready",
    body: "Save your draft anytime. Publish pushes changes to your live homepage for visitors.",
    targetSelector: "#website-builder-publish",
    placement: "bottom",
  },
];

export function getWebsiteBuilderTourSteps(plan: string): WebsiteBuilderTourStep[] {
  return BASE_TOUR_STEPS.filter((step) => !step.proOnly || isProPlan(plan));
}
