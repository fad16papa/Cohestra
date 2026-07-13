export type LocationDetectionResult =
  | { ok: true; locationLabel: string; countryCode: string; countryName: string }
  | { ok: false; reason: string };

type NominatimAddress = {
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 300_000,
    });
  });
}

function buildLocationLabel(
  address: NominatimAddress | undefined,
  displayName: string | undefined
): string {
  if (address) {
    const locality =
      address.city ?? address.town ?? address.village ?? address.suburb;
    const parts = [address.road, locality, address.state].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  if (displayName) {
    return displayName.split(",").slice(0, 2).join(",").trim();
  }

  return "";
}

async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationDetectionResult> {
  const params = new URLSearchParams({
    format: "json",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "14",
    addressdetails: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "LeadGenerationCRM/1.0 (activity-create)",
      },
    }
  );

  if (!response.ok) {
    return { ok: false, reason: "Could not resolve your address." };
  }

  const data = (await response.json()) as NominatimReverseResponse;
  const locationLabel = buildLocationLabel(data.address, data.display_name);
  const countryCode = (data.address?.country_code ?? "ph").toUpperCase();
  const countryName = data.address?.country ?? countryCode;

  if (!locationLabel) {
    return { ok: false, reason: "Could not determine your location." };
  }

  return { ok: true, locationLabel, countryCode, countryName };
}

export async function detectUserLocation(): Promise<LocationDetectionResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "Geolocation is not supported in this browser." };
  }

  try {
    const position = await readPosition();
    return await reverseGeocode(position.coords.latitude, position.coords.longitude);
  } catch {
    return {
      ok: false,
      reason: "Location access was denied or timed out.",
    };
  }
}

export function formatScheduleForStorage(dateTimeLocal: string): string {
  const date = new Date(dateTimeLocal);
  if (Number.isNaN(date.getTime())) {
    return dateTimeLocal;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function defaultScheduleDateTimeLocal(): string {
  const next = new Date();
  next.setDate(next.getDate() + ((6 - next.getDay() + 7) % 7 || 7));
  next.setHours(10, 0, 0, 0);
  return toDateTimeLocalValue(next);
}

export function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function minScheduleDateTimeLocal(): string {
  return toDateTimeLocalValue(new Date());
}
