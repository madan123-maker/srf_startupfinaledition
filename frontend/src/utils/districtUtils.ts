/**
 * Utility helper to format district display labels across the platform.
 * Ensures state prefixes like "AP - " or "Andhra Pradesh - " are stripped for UI display
 * while preserving internal/API filter capability.
 */
export const formatDistrictDisplay = (district: string): string => {
  if (!district) return '';
  return district.replace(/^(AP\s*-\s*|Andhra\s+Pradesh\s*-\s*)/i, '').trim();
};
