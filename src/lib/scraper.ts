import { HotelStorage } from "./enhanced_storage";
import { scrapeUrl, extractFeatures, getRetryStats } from "./worker";
import type { ScrapeResult } from "../types";
import type { DetailedError } from "./retry";

export class ParallelScraper {
  private storage: HotelStorage;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3, dbPath?: string) {
    this.maxConcurrent = maxConcurrent;
    this.storage = new HotelStorage(dbPath);
  }

  private async processUrl(url: string, workerId: number): Promise<ScrapeResult> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`🔍 Worker ${workerId}: Scraping ${url}`);
      const html = await scrapeUrl(url);
      
      console.log(`🤖 Worker ${workerId}: Extracting features from ${url}`);
      const features = await extractFeatures(html);
      
      if (features) {
        console.log(`✅ Worker ${workerId}: Success for ${url}`);
        return {
          url,
          success: true,
          data: features,
          timestamp,
        };
      } else {
        return {
          url,
          success: false,
          error: "Failed to extract accessibility features",
          timestamp,
        };
      }
    } catch (err: any) {
      let errorMessage = "Unknown error";
      
      // Handle detailed errors from our retry system
      if (err.type && err.message) {
        errorMessage = `${err.type}: ${err.message}`;
        if (err.attempt) {
          errorMessage += ` (failed after ${err.attempt} attempts)`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.error(`❌ Worker ${workerId}: ${errorMessage} for ${url}`);
      
      return {
        url,
        success: false,
        error: errorMessage,
        timestamp,
      };
    }
  }

  async scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
    console.log(`🎯 Starting parallel scraping with ${this.maxConcurrent} concurrent jobs`);
    console.log(`📋 ${urls.length} URLs to process`);

    // Filter out URLs already in database
    const newUrls = urls.filter(url => !this.storage.urlExists(url));
    console.log(`⏭️  ${urls.length - newUrls.length} URLs already in database`);
    console.log(`🆕 ${newUrls.length} new URLs to scrape`);

    if (newUrls.length === 0) {
      console.log("🎉 All URLs already processed!");
      return [];
    }

    const results: ScrapeResult[] = [];
    
    // Process URLs in batches with controlled concurrency
    for (let i = 0; i < newUrls.length; i += this.maxConcurrent) {
      const batch = newUrls.slice(i, i + this.maxConcurrent);
      console.log(`\n📦 Processing batch ${Math.floor(i / this.maxConcurrent) + 1}/${Math.ceil(newUrls.length / this.maxConcurrent)}`);
      
      const batchPromises = batch.map((url, index) => 
        this.processUrl(url, (i + index) % this.maxConcurrent)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Save successful results immediately
      for (const result of batchResults) {
        if (result.success && result.data) {
          try {
            const record = {
              url: result.url,
              scrapedAt: result.timestamp,
              accessibilityFeatures: result.data,
            };
            
            const id = this.storage.insertHotel(record);
            console.log(`💾 Saved hotel #${id}: ${result.url}`);
          } catch (err) {
            console.error(`❌ Failed to save ${result.url}:`, err);
          }
        }
      }
      
      // Brief pause between batches to be nice to servers
      if (i + this.maxConcurrent < newUrls.length) {
        console.log("⏱️  Brief pause between batches...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Parallel scraping complete!`);
    console.log(`📊 Processed ${results.length} URLs`);
    console.log(`✅ Success: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
    
    // Show retry statistics
    const retryStats = getRetryStats();
    if (retryStats.domains.length > 0) {
      console.log(`\n🔄 Retry Statistics:`);
      console.log(`   📡 Domains processed: ${retryStats.totalDomains}`);
      console.log(`   🚫 Circuit breakers open: ${retryStats.openCircuits}`);
      
      retryStats.domains.forEach(domain => {
        const status = domain.isOpen ? "🔴 OPEN" : "🟢 CLOSED";
        console.log(`   ${status} ${domain.domain}: ${domain.successes} successes, ${domain.failures} failures`);
      });
    }

    return results;
  }

  getStats() {
    return this.storage.getStats();
  }

  exportResults(filePath: string = "results.json") {
    return this.storage.exportToJson(filePath);
  }

  close() {
    this.storage.close();
  }
}