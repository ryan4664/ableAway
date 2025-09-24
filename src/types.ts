export interface AccessibilityFeatures {
  wheelchairAccessible: boolean;
  accessibleBathroom: boolean;
  elevator: boolean;
  brailleSignage: boolean;
  publicTransitNearby: boolean;
}

export interface HotelRecord {
  id?: number;
  url: string;
  scrapedAt: string;
  accessibilityFeatures: AccessibilityFeatures;
  rawHtml?: string; // Optional, in case we want to store for debugging
  extractionConfidence?: number; // Could be useful later
}

export interface ScrapeResult {
  url: string;
  success: boolean;
  data?: AccessibilityFeatures;
  error?: string;
  timestamp: string;
}