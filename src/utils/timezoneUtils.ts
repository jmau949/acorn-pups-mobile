/**
 * Timezone Utilities
 *
 * Utilities for detecting and working with user timezones
 */

/**
 * Get the user's current timezone
 * Uses the browser/device's built-in timezone detection
 *
 * @returns {string} The user's timezone in IANA format (e.g., "America/Los_Angeles")
 */
export function getUserTimezone(): string {
  try {
    // Use Intl.DateTimeFormat to get the user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log(`🌍 [Timezone] Detected user timezone: ${timezone}`);
    return timezone;
  } catch (error) {
    console.warn(
      `⚠️ [Timezone] Failed to detect timezone, falling back to UTC:`,
      error
    );
    return "UTC";
  }
}

/**
 * Format timezone for display
 *
 * @param timezone - IANA timezone string
 * @returns {string} Human-readable timezone description
 */
export function formatTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });

    const parts = formatter.formatToParts(now);
    const timeZoneName =
      parts.find((part) => part.type === "timeZoneName")?.value || timezone;

    return `${timezone} (${timeZoneName})`;
  } catch (error) {
    return timezone;
  }
}

/**
 * Validate if a timezone is valid
 *
 * @param timezone - Timezone string to validate
 * @returns {boolean} True if valid timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to format a date with the timezone
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
