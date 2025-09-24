import { chromium } from "playwright";
import OpenAI from "openai";
import dotenv from "dotenv";
import { HotelStorage } from "./src/storage";
import type { AccessibilityFeatures } from "./src/types";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const storage = new HotelStorage();

async function scrape(url: string): Promise<string> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const html = await page.content();
  await browser.close();
  return html.replace(/\s+/g, " ").slice(0, 6000);
}

async function extract(text: string): Promise<AccessibilityFeatures | null> {
  const prompt = `
Extract accessibility features from the hotel page text. 
Return JSON only:

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

    return JSON.parse(resp.output_text);
  } catch (err) {
    console.error("Failed to extract or parse JSON:", err);
    return null;
  }
}

async function run() {
  console.log("🚀 Starting hotel scraper with SQLite storage");
  
  // Show initial stats
  const initialStats = storage.getStats();
  console.log(`📊 Database stats: ${initialStats.totalHotels} hotels, ${initialStats.wheelchairAccessible} wheelchair accessible (${initialStats.accessibilityRate.toFixed(1)}%)`);

  const urls = [
    "https://www.atlashotel.com/",
    // "https://www.marriott.com/en-us/hotels/yycsh-sheraton-suites-calgary-eau-claire/overview/",
    // "https://www.fairmont.com/palliser-calgary/",
    // "https://www.chateaulevis.com/",
    // "https://www.fairmont.com/empress-victoria/",
    // "https://www.opushotel.com/",
    // "https://www.rosewoodhotels.com/en/hotel-georgia-vancouver",
    // "https://www.parqvancouver.com/",
    // "https://www.sparklinghill.com/",
    // "https://www.hotelgrandpacific.com/",
    // "https://www.chateauvictoria.com/",
    // "https://www.banffjaspercollection.com/hotels/elk-avenue-hotel/",
    // "https://www.banffjaspercollection.com/hotels/banff-caribou-lodge/",
    // "https://www.jwmarriottedmonton.com/",
    // "https://matrixedmonton.com/"
  ];

  for (const url of urls) {
    // Skip if already scraped
    if (storage.urlExists(url)) {
      console.log(`⏭️  Skipping ${url} (already in database)`);
      continue;
    }

    console.log(`\n🔍 Fetching ${url}`);
    try {
      const html = await scrape(url);
      const features = await extract(html);
      
      if (features) {
        const record = {
          url,
          scrapedAt: new Date().toISOString(),
          accessibilityFeatures: features,
          rawHtml: html, // Store for debugging
        };
        
        const id = storage.insertHotel(record);
        console.log(`✅ Saved hotel #${id}:`, features);
      } else {
        console.log(`❌ Failed to extract features from ${url}`);
      }
    } catch (err) {
      console.error("❌ Error with", url, err);
    }
  }

  // Show final stats
  const finalStats = storage.getStats();
  console.log(`\n🎉 Scraping complete! Final stats:`);
  console.log(`   📈 Total hotels: ${finalStats.totalHotels}`);
  console.log(`   ♿ Wheelchair accessible: ${finalStats.wheelchairAccessible} (${finalStats.accessibilityRate.toFixed(1)}%)`);
  
  // Export results
  const exported = storage.exportToJson("results.json");
  console.log(`💾 Exported ${exported} records to results.json`);
  
  storage.close();
}

run();
