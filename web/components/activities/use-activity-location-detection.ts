"use client";

import { useEffect, useState } from "react";

import { countries, defaultCountryCode, resolveCountryOption } from "@/lib/countries";
import { detectUserLocation } from "@/lib/geolocation";

type UseActivityLocationDetectionOptions = {
  onLocationDetailChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
};

export function useActivityLocationDetection({
  onLocationDetailChange,
  onCountryCodeChange,
}: UseActivityLocationDetectionOptions) {
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void detectUserLocation().then((result) => {
      if (cancelled) {
        return;
      }

      setIsDetecting(false);

      if (result.ok) {
        onLocationDetailChange(result.locationLabel);
        const detected = resolveCountryOption(
          result.countryCode,
          result.countryName
        );
        onCountryCodeChange(detected.code);
        setGeoMessage("Location detected from your device. You can edit it below.");
        return;
      }

      onCountryCodeChange(defaultCountryCode);
      setGeoMessage(
        `${result.reason} Choose a country and enter the venue address manually.`
      );
    });

    return () => {
      cancelled = true;
    };
  }, [onCountryCodeChange, onLocationDetailChange]);

  return { countryOptions: countries, geoMessage, isDetecting };
}
