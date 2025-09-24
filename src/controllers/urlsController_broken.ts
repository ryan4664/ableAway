import { html } from 'hono/html'
import { HotelStorage } from '../lib/enhanced_storage'
import { UrlStatus } from '../types'
import { Layout } from '../ui/Layout'

export const urlsController = async (c: any) => {
  const storage = new HotelStorage()
  
  // Get all hotels
  const allHotels = storage.getAllHotels()
  
  storage.close()

  // Group hotels by domain for the display
  const domainGroups: Record<string, any[]> = {}
  allHotels.forEach(hotel => {
    const domain = new URL(hotel.url).hostname
    if (!domainGroups[domain]) {
      domainGroups[domain] = []
    }
    domainGroups[domain].push(hotel)
  })

  return c.html(Layout({
    title: 'AbleAway - Accessible Hotels',
    children: `
      <div class="space-y-8">
        <!-- Hero Header -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-12 text-white text-center">
            <h1 class="text-4xl font-bold mb-3">♿ AbleAway</h1>
            <p class="text-xl text-blue-100 mb-6">Discover accessible hotels worldwide</p>
            <p class="text-blue-100">Making travel accessible for everyone, one hotel at a time</p>
          </div>
          
          <!-- Search -->
          <div class="p-6">
            <div class="relative max-w-md mx-auto">
              <input 
                type="text" 
                placeholder="Search domains..." 
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-10"
                onkeyup="filterDomains(this.value)"
              >
              <div class="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Domain Cards -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="domainGrid">
          ${Object.entries(domainGroups).map(([domain, hotels]) => `
            <a href="/domain/${encodeURIComponent(domain)}" class="domain-card block group">
              <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                <div class="bg-gradient-to-r from-blue-500 to-green-500 p-1">
                  <div class="bg-white p-6 rounded-lg">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">${domain}</h3>
                      <span class="bg-gradient-to-r from-blue-500 to-green-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                        ${hotels.length} hotel${hotels.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div class="space-y-3">
                      <div class="text-sm text-gray-600">
                        <strong>Latest Update:</strong> ${new Date(Math.max(...hotels.map((h: any) => new Date(h.scrapedAt).getTime()))).toLocaleDateString()}
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">Accessibility Score:</span>
                        <div class="flex space-x-1">
                          ${Array.from({length: 5}, (_, i) => {
                            const avgScore = hotels.reduce((sum: number, hotel: any) => {
                              const features = hotel.accessibilityFeatures;
                              const score = (features.wheelchairAccessible ? 1 : 0) + 
                                           (features.accessibleBathroom ? 1 : 0) + 
                                           (features.elevator ? 1 : 0) + 
                                           (features.brailleSignage ? 1 : 0) + 
                                           (features.publicTransitNearby ? 1 : 0);
                              return sum + score;
                            }, 0) / (hotels.length * 5);
                            return `<div class="w-3 h-3 rounded-full ${i < Math.round(avgScore * 5) ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gray-200'}"></div>`;
                          }).join('')}
                        </div>
                      </div>
                      <div class="pt-2 border-t border-gray-100">
                        <span class="text-xs text-gray-500 group-hover:text-blue-500 transition-colors flex items-center">
                          Click to explore hotels ♿
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          `).join('')}
        </div>

        <script>
          function filterDomains(searchTerm) {
            const cards = document.querySelectorAll('.domain-card');
            const term = searchTerm.toLowerCase();
            
            cards.forEach(card => {
              const domain = card.querySelector('h3').textContent.toLowerCase();
              const shouldShow = domain.includes(term);
              card.style.display = shouldShow ? 'block' : 'none';
            });
          }
        </script>
      </div>
    `
  }))
}

export const domainDetailController = async (c: any) => {
  const domain = c.req.param('domain')
  const storage = new HotelStorage()
  
  // Get hotels for this domain
  const allHotels = storage.getAllHotels()
  const hotels = allHotels.filter(hotel => new URL(hotel.url).hostname === domain)
  
  storage.close()
  
  if (hotels.length === 0) {
    return c.html(Layout({
      title: 'Domain Not Found',
      children: `
        <div class="text-center py-12">
          <h1 class="text-2xl font-bold text-gray-900">No hotels found for ${domain}</h1>
          <p class="text-gray-600 mt-2">This domain doesn't have any hotels in our database yet.</p>
          <a href="/" class="text-blue-600 hover:underline mt-4 inline-block">← Back to domains</a>
        </div>
      `
    }))
  }

  return c.html(Layout({
    title: `Hotels - ${domain}`,
    children: `
      <div class="space-y-8">
        <!-- Navigation -->
        <div class="flex items-center space-x-2 text-sm">
          <a href="/" class="text-blue-600 hover:underline font-medium">♿ Domains</a>
          <span class="text-gray-400">›</span>
          <span class="text-gray-600 font-medium">${domain}</span>
        </div>

        <!-- Header -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-8 text-white">
            <h1 class="text-3xl font-bold mb-2">${domain}</h1>
            <p class="text-blue-100 text-lg">${hotels.length} accessible hotel${hotels.length !== 1 ? 's' : ''} discovered</p>
            <p class="text-blue-100 mt-2">Explore accessibility features for each location</p>
          </div>
          
          <!-- Quick Stats -->
          <div class="p-6 bg-gradient-to-r from-gray-50 to-blue-50">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-blue-600">${hotels.filter(h => h.accessibilityFeatures.wheelchairAccessible).length}</div>
                <div class="text-sm text-gray-600">Wheelchair Accessible</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-600">${hotels.filter(h => h.accessibilityFeatures.elevator).length}</div>
                <div class="text-sm text-gray-600">Have Elevators</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-purple-600">${hotels.filter(h => h.accessibilityFeatures.accessibleBathroom).length}</div>
                <div class="text-sm text-gray-600">Accessible Bathrooms</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-orange-600">${hotels.filter(h => h.accessibilityFeatures.publicTransitNearby).length}</div>
                <div class="text-sm text-gray-600">Near Public Transit</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hotels -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${hotels.map(hotel => {
            const accessibilityCount = Object.values(hotel.accessibilityFeatures).filter(Boolean).length;
            const totalFeatures = Object.keys(hotel.accessibilityFeatures).length;
            
            return `
              <a href="/hotel/${hotel.id}" class="block group">
                <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                  <div class="bg-gradient-to-r from-blue-500 to-green-500 p-1">
                    <div class="bg-white p-6 rounded-lg">
                      <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                          <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            ${new URL(hotel.url).hostname.replace('www.', '')}
                          </h3>
                          <p class="text-sm text-gray-600 mt-1">Updated ${new Date(hotel.scrapedAt).toLocaleDateString()}</p>
                        </div>
                        <div class="ml-4">
                          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${
                            accessibilityCount >= 4 ? 'from-green-500 to-green-600 text-white' :
                            accessibilityCount >= 2 ? 'from-yellow-500 to-orange-500 text-white' :
                            'from-red-400 to-red-500 text-white'
                          }">
                            ${accessibilityCount}/${totalFeatures} ♿
                          </span>
                        </div>
                      </div>
                      
                      <div class="space-y-4">
                        <div class="grid grid-cols-5 gap-3">
                          <div class="text-center" title="Wheelchair Accessible">
                            <div class="text-2xl ${hotel.accessibilityFeatures.wheelchairAccessible ? 'text-green-500' : 'text-gray-300'} transform group-hover:scale-110 transition-transform">
                              ♿
                            </div>
                          </div>
                          <div class="text-center" title="Accessible Bathroom">
                            <div class="text-2xl ${hotel.accessibilityFeatures.accessibleBathroom ? 'text-blue-500' : 'text-gray-300'} transform group-hover:scale-110 transition-transform">
                              🚿
                            </div>
                          </div>
                          <div class="text-center" title="Elevator">
                            <div class="text-2xl ${hotel.accessibilityFeatures.elevator ? 'text-purple-500' : 'text-gray-300'} transform group-hover:scale-110 transition-transform">
                              🛗
                            </div>
                          </div>
                          <div class="text-center" title="Braille Signage">
                            <div class="text-2xl ${hotel.accessibilityFeatures.brailleSignage ? 'text-indigo-500' : 'text-gray-300'} transform group-hover:scale-110 transition-transform">
                              ⠃⠗⠇
                            </div>
                          </div>
                          <div class="text-center" title="Public Transit Nearby">
                            <div class="text-2xl ${hotel.accessibilityFeatures.publicTransitNearby ? 'text-orange-500' : 'text-gray-300'} transform group-hover:scale-110 transition-transform">
                              🚌
                            </div>
                          </div>
                        </div>
                        
                        <div class="pt-3 border-t border-gray-100">
                          <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-600 group-hover:text-blue-600 transition-colors font-medium">View full accessibility details</span>
                            <div class="text-blue-500 group-hover:text-blue-600 transition-colors font-bold">→</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            `
          }).join('')}
        </div>
      </div>
    `
  }))
}

export const hotelDetailController = async (c: any) => {
  const hotelId = c.req.param('id')
  const storage = new HotelStorage()
  
  // Get the specific hotel
  const hotels = storage.getAllHotels()
  const hotel = hotels.find(h => h.id?.toString() === hotelId)
  
  if (!hotel) {
    storage.close()
    return c.html(Layout({
      title: 'Hotel Not Found',
      children: `
        <div class="text-center py-12">
          <h1 class="text-2xl font-bold text-gray-900">Hotel Not Found</h1>
          <p class="text-gray-600 mt-2">The hotel you're looking for doesn't exist.</p>
          <a href="/" class="text-blue-600 hover:underline mt-4 inline-block">← Back to domains</a>
        </div>
      `
    }))
  }
  
  const domain = new URL(hotel.url).hostname
  storage.close()

  // Extract potential location info from domain
  const potentialLocation = domain.replace('www.', '')
  
  return c.html(Layout({
    title: `Hotel - ${domain}`,
    children: `
      <div class="space-y-8">
        <!-- Navigation -->
        <div class="flex items-center space-x-2 text-sm">
          <a href="/" class="text-blue-600 hover:underline">Domains</a>
          <span class="text-gray-400">›</span>
          <a href="/domain/${encodeURIComponent(domain)}" class="text-blue-600 hover:underline">${domain}</a>
          <span class="text-gray-400">›</span>
          <span class="text-gray-600">Hotel Details</span>
        </div>

        <!-- Hotel Header -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-8 text-white">
            <h1 class="text-3xl font-bold">Hotel Details</h1>
            <p class="text-blue-100 mt-2">Comprehensive accessibility information</p>
          </div>
          
          <div class="p-6">
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Hotel Info -->
              <div>
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Hotel Information</h2>
                <div class="space-y-3">
                  <div>
                    <label class="text-sm font-medium text-gray-500">Website</label>
                    <a href="${hotel.url}" target="_blank" class="block text-blue-600 hover:underline break-all">${hotel.url}</a>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Domain</label>
                    <p class="text-gray-900">${domain}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Last Updated</label>
                    <p class="text-gray-900">${new Date(hotel.scrapedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  ${hotel.extractionConfidence ? `
                    <div>
                      <label class="text-sm font-medium text-gray-500">Data Confidence</label>
                      <div class="flex items-center space-x-2">
                        <div class="flex-1 bg-gray-200 rounded-full h-2">
                          <div class="bg-blue-500 h-2 rounded-full" style="width: ${hotel.extractionConfidence * 100}%"></div>
                        </div>
                        <span class="text-sm text-gray-600">${Math.round(hotel.extractionConfidence * 100)}%</span>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Map placeholder -->
              <div>
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Location</h2>
                <div class="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-4xl text-gray-400 mb-2">🗺️</div>
                    <p class="text-gray-600 font-medium">${potentialLocation}</p>
                    <p class="text-sm text-gray-500 mt-1">Interactive map coming soon!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ACCESSIBILITY FEATURES - THE STAR OF THE SHOW! -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-6 text-white">
            <h2 class="text-2xl font-bold flex items-center">
              ♿ Accessibility Features
              <span class="ml-3 text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                ${Object.values(hotel.accessibilityFeatures).filter(Boolean).length}/${Object.keys(hotel.accessibilityFeatures).length} Available
              </span>
            </h2>
            <p class="text-green-100 mt-2">Making travel accessible for everyone</p>
          </div>
          
          <div class="p-6">
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- Wheelchair Accessibility -->
              <div class="p-4 rounded-lg border-2 ${hotel.accessibilityFeatures.wheelchairAccessible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">${hotel.accessibilityFeatures.wheelchairAccessible ? '♿' : '🚫'}</div>
                  <div>
                    <h3 class="font-semibold ${hotel.accessibilityFeatures.wheelchairAccessible ? 'text-green-800' : 'text-red-800'}">
                      Wheelchair Access
                    </h3>
                    <p class="text-sm ${hotel.accessibilityFeatures.wheelchairAccessible ? 'text-green-600' : 'text-red-600'}">
                      ${hotel.accessibilityFeatures.wheelchairAccessible ? 'Wheelchair accessible entrance and facilities' : 'No wheelchair accessibility information found'}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Accessible Bathroom -->
              <div class="p-4 rounded-lg border-2 ${hotel.accessibilityFeatures.accessibleBathroom ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">${hotel.accessibilityFeatures.accessibleBathroom ? '🚿' : '🚫'}</div>
                  <div>
                    <h3 class="font-semibold ${hotel.accessibilityFeatures.accessibleBathroom ? 'text-green-800' : 'text-red-800'}">
                      Accessible Bathroom
                    </h3>
                    <p class="text-sm ${hotel.accessibilityFeatures.accessibleBathroom ? 'text-green-600' : 'text-red-600'}">
                      ${hotel.accessibilityFeatures.accessibleBathroom ? 'Accessible bathroom facilities available' : 'No accessible bathroom information found'}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Elevator -->
              <div class="p-4 rounded-lg border-2 ${hotel.accessibilityFeatures.elevator ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">${hotel.accessibilityFeatures.elevator ? '🛗' : '🚫'}</div>
                  <div>
                    <h3 class="font-semibold ${hotel.accessibilityFeatures.elevator ? 'text-green-800' : 'text-red-800'}">
                      Elevator Access
                    </h3>
                    <p class="text-sm ${hotel.accessibilityFeatures.elevator ? 'text-green-600' : 'text-red-600'}">
                      ${hotel.accessibilityFeatures.elevator ? 'Elevator available for upper floors' : 'No elevator information found'}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Braille Signage -->
              <div class="p-4 rounded-lg border-2 ${hotel.accessibilityFeatures.brailleSignage ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">${hotel.accessibilityFeatures.brailleSignage ? '⠃⠗⠇' : '🚫'}</div>
                  <div>
                    <h3 class="font-semibold ${hotel.accessibilityFeatures.brailleSignage ? 'text-green-800' : 'text-red-800'}">
                      Braille Signage
                    </h3>
                    <p class="text-sm ${hotel.accessibilityFeatures.brailleSignage ? 'text-green-600' : 'text-red-600'}">
                      ${hotel.accessibilityFeatures.brailleSignage ? 'Braille signage available for visually impaired guests' : 'No braille signage information found'}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Public Transit -->
              <div class="p-4 rounded-lg border-2 ${hotel.accessibilityFeatures.publicTransitNearby ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">${hotel.accessibilityFeatures.publicTransitNearby ? '🚌' : '🚫'}</div>
                  <div>
                    <h3 class="font-semibold ${hotel.accessibilityFeatures.publicTransitNearby ? 'text-green-800' : 'text-red-800'}">
                      Public Transit
                    </h3>
                    <p class="text-sm ${hotel.accessibilityFeatures.publicTransitNearby ? 'text-green-600' : 'text-red-600'}">
                      ${hotel.accessibilityFeatures.publicTransitNearby ? 'Accessible public transportation nearby' : 'No public transit information found'}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Overall Accessibility Score -->
              <div class="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                <div class="flex items-center space-x-3">
                  <div class="text-3xl">📊</div>
                  <div>
                    <h3 class="font-semibold text-blue-800">
                      Accessibility Score
                    </h3>
                    <p class="text-sm text-blue-600">
                      ${Object.values(hotel.accessibilityFeatures).filter(Boolean).length} out of ${Object.keys(hotel.accessibilityFeatures).length} features available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Call to Action -->
        <div class="bg-gradient-to-r from-blue-500 to-green-500 rounded-lg p-6 text-white text-center">
          <h3 class="text-xl font-bold mb-2">Ready to Book?</h3>
          <p class="mb-4">Visit the hotel website to check availability and make reservations</p>
          <a href="${hotel.url}" target="_blank" class="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Visit Hotel Website →
          </a>
        </div>
      </div>
    `
  }))
}