"use client";

import { useEffect, useRef, useState } from "react";

import { getRecaptchaSiteKey, getTestCaptchaToken, isRecaptchaEnabled } from "@/lib/signup/signup-api";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark";
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

type RecaptchaCheckboxProps = {
  onTokenChange: (token: string | null) => void;
  disabled?: boolean;
};

export function RecaptchaCheckbox({ onTokenChange, disabled }: RecaptchaCheckboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const enabled = isRecaptchaEnabled();
  const siteKey = getRecaptchaSiteKey();

  useEffect(() => {
    if (!enabled) {
      onTokenChange(getTestCaptchaToken());
      return;
    }

    if (!siteKey) {
      setLoadError("CAPTCHA is not configured.");
      onTokenChange(null);
      return;
    }

    function renderWidget() {
      if (!containerRef.current || !window.grecaptcha || widgetIdRef.current !== null) {
        return;
      }

      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(null),
        "error-callback": () => onTokenChange(null),
      });
    }

    window.onRecaptchaLoad = renderWidget;

    if (window.grecaptcha) {
      renderWidget();
      return;
    }

    const existing = document.querySelector('script[data-recaptcha="true"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.recaptcha = "true";
      script.onerror = () => {
        setLoadError("Could not load CAPTCHA. Check your connection and try again.");
        onTokenChange(null);
      };
      document.body.appendChild(script);
    }

    return () => {
      widgetIdRef.current = null;
    };
  }, [enabled, onTokenChange, siteKey]);

  useEffect(() => {
    if (disabled && widgetIdRef.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetIdRef.current);
      onTokenChange(enabled ? null : getTestCaptchaToken());
    }
  }, [disabled, enabled, onTokenChange]);

  if (!enabled) {
    return (
      <p className="rounded-md border border-line bg-paper-warm px-3 py-2 text-xs text-stone">
        CAPTCHA bypass enabled for local development.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} aria-label="CAPTCHA challenge" />
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
