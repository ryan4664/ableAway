import { Database } from "bun:sqlite";
import type { HotelRecord } from "./types";

export class HotelStorage {
  private db: Database;

  constructor(dbPath: string = "hotels.db") {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // Create hotels table with all the fields we need
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hotels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        scraped_at TEXT NOT NULL,
        wheelchair_accessible BOOLEAN,
        accessible_bathroom BOOLEAN,
        elevator BOOLEAN,
        braille_signage BOOLEAN,
        public_transit_nearby BOOLEAN,
        raw_html TEXT,
        extraction_confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index on URL for fast lookups (avoid re-scraping)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_hotels_url ON hotels(url)`);
    
    // Index on scraped_at for time-based queries
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_hotels_scraped_at ON hotels(scraped_at)`);
  }

  // Insert or update a hotel record
  insertHotel(record: HotelRecord): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hotels (
        url, scraped_at, wheelchair_accessible, accessible_bathroom, 
        elevator, braille_signage, public_transit_nearby, 
        raw_html, extraction_confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      record.url,
      record.scrapedAt,
      record.accessibilityFeatures.wheelchairAccessible,
      record.accessibilityFeatures.accessibleBathroom,
      record.accessibilityFeatures.elevator,
      record.accessibilityFeatures.brailleSignage,
      record.accessibilityFeatures.publicTransitNearby,
      record.rawHtml || null,
      record.extractionConfidence || null
    );

    return result.lastInsertRowid as number;
  }

  // Check if URL already exists (to avoid re-scraping)
  urlExists(url: string): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM hotels WHERE url = ?");
    return stmt.get(url) !== null;
  }

  // Get all hotels with accessibility features
  getAllHotels(): HotelRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, url, scraped_at, wheelchair_accessible, accessible_bathroom,
             elevator, braille_signage, public_transit_nearby,
             raw_html, extraction_confidence
      FROM hotels 
      ORDER BY created_at DESC
    `);

    return stmt.all().map((row: any) => ({
      id: row.id,
      url: row.url,
      scrapedAt: row.scraped_at,
      accessibilityFeatures: {
        wheelchairAccessible: Boolean(row.wheelchair_accessible),
        accessibleBathroom: Boolean(row.accessible_bathroom),
        elevator: Boolean(row.elevator),
        brailleSignage: Boolean(row.braille_signage),
        publicTransitNearby: Boolean(row.public_transit_nearby),
      },
      rawHtml: row.raw_html,
      extractionConfidence: row.extraction_confidence,
    }));
  }

  // Get summary stats (useful for progress tracking)
  getStats() {
    const totalStmt = this.db.prepare("SELECT COUNT(*) as total FROM hotels");
    const accessibleStmt = this.db.prepare("SELECT COUNT(*) as count FROM hotels WHERE wheelchair_accessible = 1");
    
    const total = totalStmt.get() as { total: number };
    const accessible = accessibleStmt.get() as { count: number };

    return {
      totalHotels: total.total,
      wheelchairAccessible: accessible.count,
      accessibilityRate: total.total > 0 ? (accessible.count / total.total) * 100 : 0,
    };
  }

  // Export to JSON for external use
  exportToJson(filePath: string = "hotels.json") {
    const hotels = this.getAllHotels();
    Bun.write(filePath, JSON.stringify(hotels, null, 2));
    return hotels.length;
  }

  close() {
    this.db.close();
  }
}