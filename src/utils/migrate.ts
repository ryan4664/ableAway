import { HotelStorage } from "../lib/enhanced_storage";
import { UrlStatus } from "../types";

export class StorageMigrator {
  private storage: HotelStorage;

  constructor(dbPath?: string) {
    this.storage = new HotelStorage(dbPath);
  }

  // Migrate existing URLs from hardcoded list to the new URL management system
  async migrateInitialUrls() {
    console.log("🔄 Migrating initial URLs to new schema...");
    
    const initialUrls = [
      "https://www.atlashotel.com/",
      "https://www.marriott.com/en-us/hotels/yycsh-sheraton-suites-calgary-eau-claire/overview/",
      "https://www.fairmont.com/palliser-calgary/",
      "https://www.chateaulevis.com/",
      "https://www.fairmont.com/empress-victoria/",
      "https://www.opushotel.com/",
      "https://www.rosewoodhotels.com/en/hotel-georgia-vancouver",
      "https://www.parqvancouver.com/",
      "https://www.sparklinghill.com/",
      "https://www.hotelgrandpacific.com/",
      "https://www.chateauvictoria.com/",
      "https://www.banffjaspercollection.com/hotels/elk-avenue-hotel/",
      "https://www.banffjaspercollection.com/hotels/banff-caribou-lodge/",
      "https://www.jwmarriottedmonton.com/",
      "https://matrixedmonton.com/"
    ];

    let added = 0;
    for (const url of initialUrls) {
      const urlId = this.storage.addUrl(url, "initial_seed", 10); // High priority
      if (urlId > 0) added++;
    }

    console.log(`✅ Added ${added} URLs to the new schema`);
    return added;
  }

  // Add some example URLs for different discovery methods
  async addExampleDiscoveryUrls() {
    console.log("🔄 Adding example URLs for discovery testing...");
    
    // Hotel chain websites (good for finding more properties)
    const chainUrls = [
      { url: "https://www.fairmont.com/hotels-resorts/", source: "fairmont_chain", priority: 8 },
      { url: "https://www.marriott.com/en-us/search/", source: "marriott_chain", priority: 8 },
      { url: "https://www.hilton.com/en/hotels/", source: "hilton_chain", priority: 8 },
    ];

    // Regional tourism sites
    const tourismUrls = [
      { url: "https://www.destinationbc.ca/hotels/", source: "bc_tourism", priority: 6 },
      { url: "https://www.travelalberta.com/ca/where-to-stay/", source: "alberta_tourism", priority: 6 },
    ];

    // Booking aggregator sites  
    const bookingUrls = [
      { url: "https://www.booking.com/searchresults.html?ss=vancouver", source: "booking_vancouver", priority: 5 },
      { url: "https://www.expedia.ca/Hotels-Canada.d6000172.Travel-Guide-Hotels", source: "expedia_canada", priority: 5 },
    ];

    const allUrls = [...chainUrls, ...tourismUrls, ...bookingUrls];
    
    let added = 0;
    for (const { url, source, priority } of allUrls) {
      const urlId = this.storage.addUrl(url, source, priority);
      if (urlId > 0) added++;
    }

    console.log(`✅ Added ${added} discovery URLs`);
    return added;
  }

  // Show current state of the database
  showStats() {
    const stats = this.storage.getStats();
    
    console.log("\n📊 Current Database Stats:");
    console.log("URLs:");
    console.log(`  Total: ${stats.urls.total}`);
    console.log(`  Successful: ${stats.urls.successful}`);
    console.log(`  Failed: ${stats.urls.failed}`);
    console.log(`  Pending: ${stats.urls.pending}`);
    
    console.log("\nHotels:");
    console.log(`  Total: ${stats.hotels.total}`);
    console.log(`  Wheelchair Accessible: ${stats.hotels.wheelchairAccessible} (${stats.hotels.accessibilityRate.toFixed(1)}%)`);
    console.log(`  Average Confidence: ${stats.hotels.avgConfidence.toFixed(2)}`);
    
    if (stats.performance.totalAttempts > 0) {
      console.log("\nPerformance (Last 7 days):");
      console.log(`  Total Attempts: ${stats.performance.totalAttempts}`);
      console.log(`  Success Rate: ${stats.performance.successRate.toFixed(1)}%`);
      console.log(`  Average Response Time: ${stats.performance.avgResponseTime.toFixed(0)}ms`);
    }

    return stats;
  }

  // Get URLs that need scraping
  getUrlsToScrape(limit: number = 10) {
    const pendingUrls = this.storage.getUrlsToScrape([UrlStatus.PENDING, UrlStatus.NEEDS_RETRY], limit);
    
    console.log(`\n📋 URLs ready for scraping (${pendingUrls.length}/${limit}):`);
    pendingUrls.forEach((url, index) => {
      console.log(`  ${index + 1}. [${url.status.toUpperCase()}] ${url.url}`);
      if (url.failureCount > 0) {
        console.log(`     ↳ ${url.failureCount} previous failures`);
      }
    });

    return pendingUrls;
  }

  close() {
    this.storage.close();
  }
}

// Quick migration script
export async function runMigration() {
  const migrator = new StorageMigrator();
  
  await migrator.migrateInitialUrls();
  await migrator.addExampleDiscoveryUrls();
  
  migrator.showStats();
  migrator.getUrlsToScrape();
  
  migrator.close();
}