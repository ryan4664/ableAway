#!/usr/bin/env bun
import { HotelStorage } from './src/lib/enhanced_storage.ts'
import { UrlStatus } from './src/types.ts'

console.log('🏨 Adding sample hotels to database...')

const storage = new HotelStorage()

// Sample hotels with great accessibility features
const sampleHotels = [
  {
    url: 'https://www.marriott.com/en-us/hotels/jfkak-jw-marriott-essex-house-new-york/overview/',
    data: {
      name: 'JW Marriott Essex House New York',
      description: 'Luxury hotel in Manhattan with comprehensive accessibility features',
      accessibilityFeatures: {
        wheelchairAccessible: true,
        accessibleBathroom: true,
        elevator: true,
        brailleSignage: true,
        publicTransitNearby: true
      }
    },
    extractionConfidence: 0.95
  },
  {
    url: 'https://www.hilton.com/en/hotels/sfosfhf-hilton-san-francisco-union-square/',
    data: {
      name: 'Hilton San Francisco Union Square',
      description: 'Historic hotel with modern accessibility accommodations',
      accessibilityFeatures: {
        wheelchairAccessible: true,
        accessibleBathroom: true,
        elevator: true,
        brailleSignage: false,
        publicTransitNearby: true
      }
    },
    extractionConfidence: 0.88
  },
  {
    url: 'https://www.hyatt.com/en-US/hotel/florida/grand-hyatt-tampa-bay/tpagh',
    data: {
      name: 'Grand Hyatt Tampa Bay',
      description: 'Waterfront resort with excellent accessibility planning',
      accessibilityFeatures: {
        wheelchairAccessible: true,
        accessibleBathroom: true,
        elevator: true,
        brailleSignage: true,
        publicTransitNearby: false
      }
    },
    extractionConfidence: 0.92
  },
  {
    url: 'https://www.ihg.com/holidayinnexpress/hotels/us/en/chicago/chidt/hoteldetail',
    data: {
      name: 'Holiday Inn Express Chicago Downtown',
      description: 'Budget-friendly hotel with basic accessibility features',
      accessibilityFeatures: {
        wheelchairAccessible: true,
        accessibleBathroom: true,
        elevator: true,
        brailleSignage: false,
        publicTransitNearby: true
      }
    },
    extractionConfidence: 0.85
  },
  {
    url: 'https://www.bestwestern.com/en_US/book/hotels-in-seattle/best-western-plus-pioneer-square-hotel-downtown/propertyCode.48127.html',
    data: {
      name: 'Best Western Plus Pioneer Square Hotel Downtown',
      description: 'Historic Seattle hotel with accessibility upgrades',
      accessibilityFeatures: {
        wheelchairAccessible: false,
        accessibleBathroom: true,
        elevator: true,
        brailleSignage: false,
        publicTransitNearby: true
      }
    },
    extractionConfidence: 0.78
  }
]

// Add each hotel to the database
for (const hotel of sampleHotels) {
  try {
    // First, add the URL to get an ID
    const domain = new URL(hotel.url).hostname
    const urlId = storage.addUrl(hotel.url, `sample-${domain}`)
    
    // Create HotelData object
    const hotelData = {
      urlId: urlId,
      accessibilityFeatures: hotel.data.accessibilityFeatures,
      extractedAt: new Date().toISOString(),
      confidenceScore: hotel.extractionConfidence,
      hotelName: hotel.data.name,
    }
    
    // Save the hotel data
    storage.saveHotelData(hotelData)
    
    // Update URL status to SUCCESS
    storage.updateUrlStatus(urlId, UrlStatus.SUCCESS)
    
    console.log(`✅ Added: ${hotel.data.name}`)
  } catch (error) {
    console.error(`❌ Failed to add ${hotel.data.name}:`, error)
  }
}

storage.close()

console.log('\n🎉 Sample hotels added successfully!')
console.log('🌐 Visit http://localhost:3000 to see them!')