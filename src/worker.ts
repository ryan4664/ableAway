import { chromium } from "playwright";
import OpenAI from "openai";
import type { AccessibilityFeatures } from "./types";
import { RetryManager, RetryableError, ErrorType } from "./retry";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const retryManager = new RetryManager({
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 15000,
  backoffMultiplier: 2,
  jitter: true,
});

export async function scrapeUrl(url: string): Promise<string> {
  return retryManager.executeWithRetry(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Set a reasonable timeout
      await page.goto(url, { 
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      
      const html = await page.content();
      
      if (!html || html.length < 100) {
        throw new RetryableError(
          ErrorType.BROWSER_ERROR,
          "Page content too short or empty"
        );
      }
      
      return html.replace(/\s+/g, " ").slice(0, 6000);
      
    } catch (error: any) {
      // Convert browser errors to retryable errors
      if (error.name === "TimeoutError") {
        throw new RetryableError(
          ErrorType.TIMEOUT_ERROR,
          `Page load timeout for ${url}`,
          error
        );
      }
      
      if (error.message.includes("net::")) {
        throw new RetryableError(
          ErrorType.NETWORK_ERROR,
          `Network error loading ${url}: ${error.message}`,
          error
        );
      }
      
      throw error; // Re-throw unknown errors
      
    } finally {
      await browser.close();
    }
  }, url, "scraping");
}

export async function extractFeatures(text: string): Promise<AccessibilityFeatures | null> {
  return retryManager.executeWithRetry(async () => {
    const prompt = `
Extract accessibility features from the hotel page text. 
Return JSON only, no additional text:

{
  "wheelchairAccessible": boolean,
  "accessibleBathroom": boolean,
  "elevator": boolean,
  "brailleSignage": boolean,
  "publicTransitNearby": boolean
}

Text: """${text}"""
    `;

    try {
      const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        temperature: 0,
      });

      const output = resp.output_text.trim();
      
      if (!output) {
        throw new RetryableError(
          ErrorType.AI_EXTRACTION_ERROR,
          "Empty response from AI model"
        );
      }

      const parsed = JSON.parse(output);
      
      // Validate that we got the expected structure
      const requiredFields = ['wheelchairAccessible', 'accessibleBathroom', 'elevator', 'brailleSignage', 'publicTransitNearby'];
      const missingFields = requiredFields.filter(field => !(field in parsed));
      
      if (missingFields.length > 0) {
        throw new RetryableError(
          ErrorType.PARSING_ERROR,
          `Missing required fields in AI response: ${missingFields.join(', ')}`
        );
      }

      return parsed;
      
    } catch (error: any) {
      if (error.name === "SyntaxError" || error.message.includes("JSON")) {
        throw new RetryableError(
          ErrorType.PARSING_ERROR,
          `Failed to parse JSON from AI response: ${error.message}`,
          error
        );
      }
      
      if (error.status === 429) {
        throw new RetryableError(
          ErrorType.AI_EXTRACTION_ERROR,
          "OpenAI rate limit hit",
          error
        );
      }
      
      if (error.status >= 500) {
        throw new RetryableError(
          ErrorType.AI_EXTRACTION_ERROR,
          `OpenAI server error: ${error.message}`,
          error
        );
      }
      
      // Don't retry client errors (400-499 except 429)
      if (error.status >= 400 && error.status < 500) {
        throw new RetryableError(
          ErrorType.AI_EXTRACTION_ERROR,
          `OpenAI client error: ${error.message}`,
          error,
          false // Don't retry
        );
      }
      
      throw error; // Re-throw unknown errors
    }
  }, "AI-extraction", "feature extraction");
}

export function getRetryStats() {
  return retryManager.getStats();
}