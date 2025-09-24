import dotenv from "dotenv";
import { ParallelScraper } from "./lib/scraper";
import { HotelStorage } from "./lib/enhanced_storage";
import { UrlStatus } from "./types";

dotenv.config();

async function main() {
  console.log("🚀 Starting AbleAway accessibility scraper!");
  
  // Use the enhanced storage system
  const storage = new HotelStorage();
  const scraper = new ParallelScraper(3); // 3 concurrent workers
  
  // Show initial stats
  const initialStats = storage.getStats();
  console.log("📊 Initial Database State:");
  console.log(`   URLs: ${initialStats.urls.total} total (${initialStats.urls.pending} pending, ${initialStats.urls.successful} successful)`);
  console.log(`   Hotels: ${initialStats.hotels.total} scraped, ${initialStats.hotels.wheelchairAccessible} accessible (${initialStats.hotels.accessibilityRate.toFixed(1)}%)`);
  
  // Get URLs that need scraping from the database
  const urlsToScrape = storage.getUrlsToScrape([UrlStatus.PENDING, UrlStatus.NEEDS_RETRY], 15);
  
  if (urlsToScrape.length === 0) {
    console.log("🎉 No URLs need scraping! All caught up.");
    storage.close();
    scraper.close();
    return;
  }
  
  console.log(`\n🎯 Found ${urlsToScrape.length} URLs to scrape:`);
  urlsToScrape.forEach((urlRecord, i) => {
    const retryInfo = urlRecord.failureCount > 0 ? ` (retry ${urlRecord.failureCount})` : "";
    console.log(`   ${i + 1}. [${urlRecord.status.toUpperCase()}] ${urlRecord.url}${retryInfo}`);
  });

  const urls = urlsToScrape.map(ur => ur.url);

  try {
    const results = await scraper.scrapeUrls(urls);
    
    // Show final stats
    const finalStats = storage.getStats();
    console.log(`\n🎉 Scraping complete! Final stats:`);
    console.log(`   📈 URLs: ${finalStats.urls.total} total, ${finalStats.urls.successful} successful`);
    console.log(`   🏨 Hotels: ${finalStats.hotels.total} scraped`);
    console.log(`   ♿ Accessibility: ${finalStats.hotels.wheelchairAccessible}/${finalStats.hotels.total} (${finalStats.hotels.accessibilityRate.toFixed(1)}%)`);
    console.log(`   📊 Avg Confidence: ${finalStats.hotels.avgConfidence.toFixed(2)}`);
    
    if (finalStats.performance.totalAttempts > 0) {
      console.log(`   🚀 Success Rate: ${finalStats.performance.successRate.toFixed(1)}%`);
      console.log(`   ⚡ Avg Response: ${finalStats.performance.avgResponseTime.toFixed(0)}ms`);
    }
    
    // Export results
    const exported = storage.exportToJson("results.json");
    console.log(`💾 Exported ${exported} records to results.json`);
    
  } catch (err) {
    console.error("❌ Scraping failed:", err);
  } finally {
    storage.close();
    scraper.close();
  }
}

main().catch(console.error);