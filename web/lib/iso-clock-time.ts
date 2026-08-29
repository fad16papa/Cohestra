const ISO_CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isIsoClockTime(value: string): boolean {
  return ISO_CLOCK_TIME.test(value.trim());
}
