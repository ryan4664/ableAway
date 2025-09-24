import { Database } from "bun:sqlite";
import type { 
  HotelRecord, AccessibilityFeatures, UrlRecord, ScrapeAttempt, 
  HotelData, HotelDataHistory, DiscoveryPattern, ScrapeStrategy 
} from "../types";
import { UrlStatus } from "../types";

export class HotelStorage {
  private db: Database;

  constructor(dbPath: string = "hotels.db") {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // URLs table - central registry of all hotel URLs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        domain TEXT NOT NULL,
        status TEXT NOT NULL,
        first_discovered TEXT NOT NULL,
        last_attempted TEXT,
        last_successful TEXT,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 1,
        discovery_source TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scrape attempts - detailed log of every scraping attempt
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scrape_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        strategy TEXT NOT NULL,
        response_time INTEGER,
        html_size INTEGER,
        error_type TEXT,
        error_message TEXT,
        confidence_score REAL,
        data_extracted BOOLEAN NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (url_id) REFERENCES urls (id)
      )
    `);

    // Hotel data - current best data for each hotel
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hotel_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_id INTEGER UNIQUE NOT NULL,
        wheelchair_accessible BOOLEAN,
        accessible_bathroom BOOLEAN,
        elevator BOOLEAN,
        braille_signage BOOLEAN,
        public_transit_nearby BOOLEAN,
        extracted_at TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        raw_html TEXT,
        hotel_name TEXT,
        location TEXT,
        phone_number TEXT,
        email TEXT,
        amenities TEXT, -- JSON array
        price_range TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (url_id) REFERENCES urls (id)
      )
    `);

    // Historical data snapshots
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hotel_data_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_id INTEGER NOT NULL,
        data_snapshot TEXT NOT NULL, -- JSON
        changes_detected TEXT, -- JSON array
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (url_id) REFERENCES urls (id)
      )
    `);

    // Discovery patterns - learn what works for finding new hotels
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS discovery_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        source_url TEXT NOT NULL,
        pattern TEXT NOT NULL,
        success_rate REAL DEFAULT 0.0,
        last_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_urls_domain ON urls(domain)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_urls_status ON urls(status)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_urls_priority ON urls(priority DESC)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_scrape_attempts_url_id ON scrape_attempts(url_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_scrape_attempts_timestamp ON scrape_attempts(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_hotel_data_confidence ON hotel_data(confidence_score DESC)`);
    
    // Legacy table for backward compatibility
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
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_hotels_url ON hotels(url)`);
  }

  // === URL MANAGEMENT ===

  addUrl(url: string, discoverySource?: string, priority: number = 1): number {
    const domain = this.extractDomain(url);
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO urls (
        url, domain, status, first_discovered, priority, discovery_source
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      url, 
      domain, 
      UrlStatus.PENDING, 
      new Date().toISOString(),
      priority,
      discoverySource || null
    );
    
    return result.lastInsertRowid as number;
  }

  getUrlsToScrape(status: UrlStatus | UrlStatus[] = UrlStatus.PENDING, limit: number = 50): UrlRecord[] {
    const statusArray = Array.isArray(status) ? status : [status];
    const placeholders = statusArray.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      SELECT * FROM urls 
      WHERE status IN (${placeholders})
      ORDER BY priority DESC, failure_count ASC, last_attempted ASC NULLS FIRST
      LIMIT ?
    `);
    
    const rows = stmt.all(...statusArray, limit);
    return this.mapUrlRows(rows);
  }

  updateUrlStatus(urlId: number, status: UrlStatus, notes?: string) {
    const stmt = this.db.prepare(`
      UPDATE urls 
      SET status = ?, updated_at = ?, last_attempted = ?, notes = ?
      WHERE id = ?
    `);
    
    stmt.run(status, new Date().toISOString(), new Date().toISOString(), notes || null, urlId);
  }

  recordScrapeAttempt(attempt: Omit<ScrapeAttempt, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO scrape_attempts (
        url_id, timestamp, success, strategy, response_time, html_size,
        error_type, error_message, confidence_score, data_extracted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      attempt.urlId,
      attempt.timestamp,
      attempt.success,
      attempt.strategy,
      attempt.responseTime || null,
      attempt.htmlSize || null,
      attempt.errorType || null,
      attempt.errorMessage || null,
      attempt.confidenceScore || null,
      attempt.dataExtracted
    );

    // Update URL success/failure counts
    if (attempt.success) {
      this.db.prepare(`
        UPDATE urls 
        SET success_count = success_count + 1, last_successful = ?, status = ?
        WHERE id = ?
      `).run(attempt.timestamp, UrlStatus.SUCCESS, attempt.urlId);
    } else {
      this.db.prepare(`
        UPDATE urls 
        SET failure_count = failure_count + 1, status = ?
        WHERE id = ?
      `).run(UrlStatus.NEEDS_RETRY, attempt.urlId);
    }

    return result.lastInsertRowid as number;
  }

  // === HOTEL DATA MANAGEMENT ===

  saveHotelData(data: Omit<HotelData, 'id'>): number {
    // First, get existing data for comparison
    const existing = this.getHotelData(data.urlId);
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hotel_data (
        url_id, wheelchair_accessible, accessible_bathroom, elevator,
        braille_signage, public_transit_nearby, extracted_at, confidence_score,
        raw_html, hotel_name, location, phone_number, email, amenities, price_range,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.urlId,
      data.accessibilityFeatures.wheelchairAccessible,
      data.accessibilityFeatures.accessibleBathroom,
      data.accessibilityFeatures.elevator,
      data.accessibilityFeatures.brailleSignage,
      data.accessibilityFeatures.publicTransitNearby,
      data.extractedAt,
      data.confidenceScore,
      data.rawHtml || null,
      data.hotelName || null,
      data.location || null,
      data.phoneNumber || null,
      data.email || null,
      data.amenities ? JSON.stringify(data.amenities) : null,
      data.priceRange || null,
      new Date().toISOString()
    );

    // Save historical snapshot if data changed
    if (existing) {
      const changes = this.detectChanges(existing, data);
      if (changes.length > 0) {
        this.saveHistoricalSnapshot(data.urlId, existing, changes);
      }
    }

    return result.lastInsertRowid as number;
  }

  getHotelData(urlId: number): HotelData | null {
    const stmt = this.db.prepare(`
      SELECT * FROM hotel_data WHERE url_id = ?
    `);
    
    const row: any = stmt.get(urlId);
    if (!row) return null;

    return {
      id: row.id,
      urlId: row.url_id,
      accessibilityFeatures: {
        wheelchairAccessible: Boolean(row.wheelchair_accessible),
        accessibleBathroom: Boolean(row.accessible_bathroom),
        elevator: Boolean(row.elevator),
        brailleSignage: Boolean(row.braille_signage),
        publicTransitNearby: Boolean(row.public_transit_nearby),
      },
      extractedAt: row.extracted_at,
      confidenceScore: row.confidence_score,
      rawHtml: row.raw_html,
      hotelName: row.hotel_name,
      location: row.location,
      phoneNumber: row.phone_number,
      email: row.email,
      amenities: row.amenities ? JSON.parse(row.amenities) : null,
      priceRange: row.price_range,
    };
  }

  private saveHistoricalSnapshot(urlId: number, oldData: HotelData, changes: string[]) {
    const stmt = this.db.prepare(`
      INSERT INTO hotel_data_history (url_id, data_snapshot, changes_detected, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(
      urlId,
      JSON.stringify(oldData),
      JSON.stringify(changes),
      new Date().toISOString()
    );
  }

  private detectChanges(oldData: HotelData, newData: HotelData): string[] {
    const changes: string[] = [];
    
    // Compare accessibility features
    const oldFeatures = oldData.accessibilityFeatures;
    const newFeatures = newData.accessibilityFeatures;
    
    Object.keys(newFeatures).forEach(key => {
      const featureKey = key as keyof AccessibilityFeatures;
      if (oldFeatures[featureKey] !== newFeatures[featureKey]) {
        changes.push(`${key}: ${oldFeatures[featureKey]} → ${newFeatures[featureKey]}`);
      }
    });
    
    // Compare other fields
    if (oldData.hotelName !== newData.hotelName) {
      changes.push(`hotelName: ${oldData.hotelName} → ${newData.hotelName}`);
    }
    
    return changes;
  }

  // === LEGACY COMPATIBILITY ===

  // Maintain compatibility with existing code
  insertHotel(record: HotelRecord): number {
    // Add to new schema
    const urlId = this.addUrl(record.url, "legacy_import");
    
    const hotelData: Omit<HotelData, 'id'> = {
      urlId,
      accessibilityFeatures: record.accessibilityFeatures,
      extractedAt: record.scrapedAt,
      confidenceScore: record.extractionConfidence || 0.5,
      rawHtml: record.rawHtml,
    };
    
    this.saveHotelData(hotelData);
    
    // Also save to legacy table for backward compatibility
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

  urlExists(url: string): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM urls WHERE url = ? AND status != ?");
    return stmt.get(url, UrlStatus.BLOCKED) !== null;
  }

  getAllHotels(): HotelRecord[] {
    const stmt = this.db.prepare(`
      SELECT h.*, u.url FROM hotel_data h
      JOIN urls u ON h.url_id = u.id
      ORDER BY h.confidence_score DESC, h.updated_at DESC
    `);

    return stmt.all().map((row: any) => ({
      id: row.id,
      url: row.url,
      scrapedAt: row.extracted_at,
      accessibilityFeatures: {
        wheelchairAccessible: Boolean(row.wheelchair_accessible),
        accessibleBathroom: Boolean(row.accessible_bathroom),
        elevator: Boolean(row.elevator),
        brailleSignage: Boolean(row.braille_signage),
        publicTransitNearby: Boolean(row.public_transit_nearby),
      },
      rawHtml: row.raw_html,
      extractionConfidence: row.confidence_score,
    }));
  }

  getStats() {
    const urlStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_urls,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_urls,
        SUM(CASE WHEN status = 'failed' OR status = 'blocked' THEN 1 ELSE 0 END) as failed_urls,
        SUM(CASE WHEN status = 'pending' OR status = 'needs_retry' THEN 1 ELSE 0 END) as pending_urls
      FROM urls
    `).get() as any;

    const hotelStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_hotels,
        SUM(CASE WHEN wheelchair_accessible = 1 THEN 1 ELSE 0 END) as wheelchair_accessible,
        AVG(confidence_score) as avg_confidence
      FROM hotel_data
    `).get() as any;

    const attemptStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
        AVG(response_time) as avg_response_time
      FROM scrape_attempts
      WHERE timestamp > datetime('now', '-7 days')
    `).get() as any;

    return {
      urls: {
        total: urlStats.total_urls || 0,
        successful: urlStats.successful_urls || 0,
        failed: urlStats.failed_urls || 0,
        pending: urlStats.pending_urls || 0,
      },
      hotels: {
        total: hotelStats.total_hotels || 0,
        wheelchairAccessible: hotelStats.wheelchair_accessible || 0,
        accessibilityRate: hotelStats.total_hotels > 0 
          ? (hotelStats.wheelchair_accessible / hotelStats.total_hotels) * 100 
          : 0,
        avgConfidence: hotelStats.avg_confidence || 0,
      },
      performance: {
        totalAttempts: attemptStats.total_attempts || 0,
        successRate: attemptStats.total_attempts > 0
          ? (attemptStats.successful_attempts / attemptStats.total_attempts) * 100
          : 0,
        avgResponseTime: attemptStats.avg_response_time || 0,
      }
    };
  }

  exportToJson(filePath: string = "hotels.json") {
    const hotels = this.getAllHotels();
    Bun.write(filePath, JSON.stringify(hotels, null, 2));
    return hotels.length;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  }

  private mapUrlRows(rows: any[]): UrlRecord[] {
    return rows.map(row => ({
      id: row.id,
      url: row.url,
      domain: row.domain,
      status: row.status as UrlStatus,
      firstDiscovered: row.first_discovered,
      lastAttempted: row.last_attempted,
      lastSuccessful: row.last_successful,
      successCount: row.success_count,
      failureCount: row.failure_count,
      priority: row.priority,
      discoverySource: row.discovery_source,
      notes: row.notes,
    }));
  }

  close() {
    this.db.close();
  }
}