export interface AccessibilityFeatures {
  wheelchairAccessible: boolean;
  accessibleBathroom: boolean;
  elevator: boolean;
  brailleSignage: boolean;
  publicTransitNearby: boolean;
}

export enum UrlStatus {
  PENDING = "pending",           // Never attempted
  SUCCESS = "success",           // Last attempt succeeded
  FAILED = "failed",            // Last attempt failed
  NEEDS_RETRY = "needs_retry",  // Failed but should try again
  STALE = "stale",              // Successful but data is old
  DISCOVERED = "discovered",     // Found but not yet processed
  BLOCKED = "blocked"           // Permanently blocked (404, 403, etc.)
}

export enum ScrapeStrategy {
  BASIC = "basic",              // Standard scraping
  AGGRESSIVE = "aggressive",     // More thorough extraction
  MINIMAL = "minimal",          // Fast, basic extraction only
  RETRY_DIFFERENT = "retry_different"  // Try different approach
}

export interface UrlRecord {
  id?: number;
  url: string;
  domain: string;
  status: UrlStatus;
  firstDiscovered: string;
  lastAttempted?: string;
  lastSuccessful?: string;
  successCount: number;
  failureCount: number;
  priority: number;             // Higher = more important to scrape
  discoverySource?: string;     // How we found this URL
  notes?: string;
}

export interface ScrapeAttempt {
  id?: number;
  urlId: number;
  timestamp: string;
  success: boolean;
  strategy: ScrapeStrategy;
  responseTime?: number;        // How long the scrape took
  htmlSize?: number;           // Size of content retrieved
  errorType?: string;
  errorMessage?: string;
  confidenceScore?: number;     // How confident we are in the extracted data
  dataExtracted: boolean;       // Did we get any useful data?
}

export interface HotelData {
  id?: number;
  urlId: number;
  accessibilityFeatures: AccessibilityFeatures;
  extractedAt: string;
  confidenceScore: number;
  rawHtml?: string;            // Store for analysis/debugging
  
  // Additional hotel info we might extract
  hotelName?: string;
  location?: string;
  phoneNumber?: string;
  email?: string;
  amenities?: string[];        // Pool, gym, spa, etc.
  priceRange?: string;         // $, $$, $$$, $$$$
}

export interface HotelDataHistory {
  id?: number;
  urlId: number;
  dataSnapshot: HotelData;     // Historical data point
  changesDetected?: string[];  // What changed from last scrape
  timestamp: string;
}

// For tracking discovery patterns
export interface DiscoveryPattern {
  id?: number;
  sourceType: string;          // "chain_website", "booking_site", "tourism_board"
  sourceUrl: string;
  pattern: string;             // CSS selector or URL pattern that worked
  successRate: number;
  lastUsed: string;
}

// Legacy interfaces for compatibility
export interface HotelRecord {
  id?: number;
  url: string;
  scrapedAt: string;
  accessibilityFeatures: AccessibilityFeatures;
  rawHtml?: string;
  extractionConfidence?: number;
}

export interface ScrapeResult {
  url: string;
  success: boolean;
  data?: AccessibilityFeatures;
  error?: string;
  timestamp: string;
  strategy?: ScrapeStrategy;
  responseTime?: number;
  confidenceScore?: number;
}