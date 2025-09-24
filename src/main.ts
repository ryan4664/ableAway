import dotenv from "dotenv";
import { ParallelScraper } from "./scraper";

dotenv.config();

async function main() {
  console.log("🚀 Starting parallel hotel scraper!");
  
  const scraper = new ParallelScraper(3); // 3 concurrent workers
  
  // Show initial stats
  const initialStats = scraper.getStats();
  console.log(`📊 Database stats: ${initialStats.totalHotels} hotels, ${initialStats.wheelchairAccessible} wheelchair accessible (${initialStats.accessibilityRate.toFixed(1)}%)`);

  const urls = [
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

  try {
    const results = await scraper.scrapeUrls(urls);
    
    // Show final stats
    const finalStats = scraper.getStats();
    console.log(`\n🎉 Scraping complete! Final stats:`);
    console.log(`   📈 Total hotels: ${finalStats.totalHotels}`);
    console.log(`   ♿ Wheelchair accessible: ${finalStats.wheelchairAccessible} (${finalStats.accessibilityRate.toFixed(1)}%)`);
    
    // Export results
    const exported = scraper.exportResults("results.json");
    console.log(`💾 Exported ${exported} records to results.json`);
    
  } catch (err) {
    console.error("❌ Scraping failed:", err);
  } finally {
    scraper.close();
  }
}

main().catch(console.error);