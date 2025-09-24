import { useState, useEffect } from 'preact/hooks'

interface Hotel {
  id: number
  url: string
  scrapedAt: string
  accessibilityFeatures: {
    wheelchairAccessible: boolean
    accessibleBathroom: boolean
    elevator: boolean
    brailleSignage: boolean
    publicTransitNearby: boolean
  }
  extractionConfidence?: number
}

type DomainGroups = Record<string, Hotel[]>

export function App() {
  const [domainGroups, setDomainGroups] = useState<DomainGroups>({})
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'home' | 'domain' | 'hotel'>('home')
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Load data
  useEffect(() => {
    fetch('/api/domains')
      .then(res => res.json())
      .then(data => {
        setDomainGroups(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load domains:', err)
        setLoading(false)
      })
  }, [])

  const viewDomain = (domain: string) => {
    setSelectedDomain(domain)
    setCurrentView('domain')
  }

  const viewHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setCurrentView('hotel')
  }

  const goHome = () => {
    setCurrentView('home')
    setSelectedDomain('')
    setSelectedHotel(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">♿</div>
          <div className="text-xl font-semibold text-gray-700">Loading AbleAway...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <button 
              onClick={goHome}
              className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              ♿ AbleAway
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {currentView === 'home' && (
          <HomePage 
            domainGroups={domainGroups}
            onViewDomain={viewDomain}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}
        
        {currentView === 'domain' && domainGroups[selectedDomain] && (
          <DomainPage 
            domain={selectedDomain}
            hotels={domainGroups[selectedDomain]}
            onViewHotel={viewHotel}
            onGoHome={goHome}
          />
        )}
        
        {currentView === 'hotel' && selectedHotel && (
          <HotelPage 
            hotel={selectedHotel}
            onGoHome={goHome}
            onViewDomain={() => viewDomain(new URL(selectedHotel.url).hostname)}
          />
        )}
      </main>
    </div>
  )
}

// Home Page Component
function HomePage({ domainGroups, onViewDomain, searchTerm, onSearchChange }: {
  domainGroups: DomainGroups
  onViewDomain: (domain: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}) {
  const filteredDomains = Object.entries(domainGroups).filter(([domain]) =>
    domain.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-12 text-white text-center">
          <h1 className="text-4xl font-bold mb-3">♿ AbleAway</h1>
          <p className="text-xl text-blue-100 mb-6">Discover accessible hotels worldwide</p>
          <p className="text-blue-100">Making travel accessible for everyone, one hotel at a time</p>
        </div>
        
        {/* Search */}
        <div className="p-6">
          <div className="relative max-w-md mx-auto">
            <input 
              type="text" 
              placeholder="Search domains..."
              value={searchTerm}
              onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-10"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDomains.map(([domain, hotels]) => (
          <DomainCard 
            key={domain}
            domain={domain}
            hotels={hotels}
            onClick={() => onViewDomain(domain)}
          />
        ))}
      </div>
    </div>
  )
}

// Domain Card Component
function DomainCard({ domain, hotels, onClick }: {
  domain: string
  hotels: Hotel[]
  onClick: () => void
}) {
  const avgScore = hotels.reduce((sum, hotel) => {
    const features = hotel.accessibilityFeatures
    const score = (features.wheelchairAccessible ? 1 : 0) + 
                 (features.accessibleBathroom ? 1 : 0) + 
                 (features.elevator ? 1 : 0) + 
                 (features.brailleSignage ? 1 : 0) + 
                 (features.publicTransitNearby ? 1 : 0)
    return sum + score
  }, 0) / (hotels.length * 5)

  const latestDate = new Date(Math.max(...hotels.map(h => new Date(h.scrapedAt).getTime()))).toLocaleDateString()

  return (
    <button
      onClick={onClick}
      className="block group w-full text-left"
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200 transform group-hover:scale-[1.02]">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 p-1">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{domain}</h3>
              <span className="bg-gradient-to-r from-blue-500 to-green-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                {hotels.length} hotel{hotels.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <strong>Latest Update:</strong> {latestDate}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Accessibility Score:</span>
                <div className="flex space-x-1">
                  {Array.from({length: 5}, (_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${i < Math.round(avgScore * 5) ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors flex items-center">
                  Click to explore hotels ♿
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

// Domain Page Component
function DomainPage({ domain, hotels, onViewHotel, onGoHome }: {
  domain: string
  hotels: Hotel[]
  onViewHotel: (hotel: Hotel) => void
  onGoHome: () => void
}) {
  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="flex items-center space-x-2 text-sm">
        <button onClick={onGoHome} className="text-blue-600 hover:underline font-medium">♿ Domains</button>
        <span className="text-gray-400">›</span>
        <span className="text-gray-600 font-medium">{domain}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{domain}</h1>
          <p className="text-blue-100 text-lg">{hotels.length} accessible hotel{hotels.length !== 1 ? 's' : ''} discovered</p>
          <p className="text-blue-100 mt-2">Explore accessibility features for each location</p>
        </div>
        
        {/* Quick Stats */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{hotels.filter(h => h.accessibilityFeatures.wheelchairAccessible).length}</div>
              <div className="text-sm text-gray-600">Wheelchair Accessible</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{hotels.filter(h => h.accessibilityFeatures.elevator).length}</div>
              <div className="text-sm text-gray-600">Have Elevators</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{hotels.filter(h => h.accessibilityFeatures.accessibleBathroom).length}</div>
              <div className="text-sm text-gray-600">Accessible Bathrooms</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{hotels.filter(h => h.accessibilityFeatures.publicTransitNearby).length}</div>
              <div className="text-sm text-gray-600">Near Public Transit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hotels */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map(hotel => (
          <HotelCard key={hotel.id} hotel={hotel} onClick={() => onViewHotel(hotel)} />
        ))}
      </div>
    </div>
  )
}

// Hotel Card Component
function HotelCard({ hotel, onClick }: { hotel: Hotel; onClick: () => void }) {
  const accessibilityCount = Object.values(hotel.accessibilityFeatures).filter(Boolean).length
  const totalFeatures = Object.keys(hotel.accessibilityFeatures).length
  
  const badgeColor = accessibilityCount >= 4 ? 'from-green-500 to-green-600 text-white' :
                    accessibilityCount >= 2 ? 'from-yellow-500 to-orange-500 text-white' :
                    'from-red-400 to-red-500 text-white'

  return (
    <button onClick={onClick} className="block group w-full text-left">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200 transform group-hover:scale-[1.02]">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 p-1">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {new URL(hotel.url).hostname.replace('www.', '')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Updated {new Date(hotel.scrapedAt).toLocaleDateString()}</p>
              </div>
              <div className="ml-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${badgeColor}`}>
                  {accessibilityCount}/{totalFeatures} ♿
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center" title="Wheelchair Accessible">
                  <div className={`text-2xl ${hotel.accessibilityFeatures.wheelchairAccessible ? 'text-green-500' : 'text-gray-300'} transform group-hover:scale-105 transition-transform duration-150`}>
                    ♿
                  </div>
                </div>
                <div className="text-center" title="Accessible Bathroom">
                  <div className={`text-2xl ${hotel.accessibilityFeatures.accessibleBathroom ? 'text-blue-500' : 'text-gray-300'} transform group-hover:scale-105 transition-transform duration-150`}>
                    🚿
                  </div>
                </div>
                <div className="text-center" title="Elevator">
                  <div className={`text-2xl ${hotel.accessibilityFeatures.elevator ? 'text-purple-500' : 'text-gray-300'} transform group-hover:scale-105 transition-transform duration-150`}>
                    🛗
                  </div>
                </div>
                <div className="text-center" title="Braille Signage">
                  <div className={`text-2xl ${hotel.accessibilityFeatures.brailleSignage ? 'text-indigo-500' : 'text-gray-300'} transform group-hover:scale-105 transition-transform duration-150`}>
                    ⠃⠗⠇
                  </div>
                </div>
                <div className="text-center" title="Public Transit Nearby">
                  <div className={`text-2xl ${hotel.accessibilityFeatures.publicTransitNearby ? 'text-orange-500' : 'text-gray-300'} transform group-hover:scale-105 transition-transform duration-150`}>
                    🚌
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors font-medium">View full accessibility details</span>
                  <div className="text-blue-500 group-hover:text-blue-600 transition-colors font-bold">→</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

// Hotel Page Component  
function HotelPage({ hotel, onGoHome, onViewDomain }: {
  hotel: Hotel
  onGoHome: () => void
  onViewDomain: () => void
}) {
  const domain = new URL(hotel.url).hostname
  const potentialLocation = domain.replace('www.', '')
  
  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="flex items-center space-x-2 text-sm">
        <button onClick={onGoHome} className="text-blue-600 hover:underline">Domains</button>
        <span className="text-gray-400">›</span>
        <button onClick={onViewDomain} className="text-blue-600 hover:underline">{domain}</button>
        <span className="text-gray-400">›</span>
        <span className="text-gray-600">Hotel Details</span>
      </div>

      {/* Hotel Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-8 text-white">
          <h1 className="text-3xl font-bold">Hotel Details</h1>
          <p className="text-blue-100 mt-2">Comprehensive accessibility information</p>
        </div>
        
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Hotel Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Hotel Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Website</label>
                  <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline break-all">{hotel.url}</a>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Domain</label>
                  <p className="text-gray-900">{domain}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">{new Date(hotel.scrapedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {hotel.extractionConfidence && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data Confidence</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{width: `${hotel.extractionConfidence * 100}%`}}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(hotel.extractionConfidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map placeholder */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl text-gray-400 mb-2">🗺️</div>
                  <p className="text-gray-600 font-medium">{potentialLocation}</p>
                  <p className="text-sm text-gray-500 mt-1">Interactive map coming soon!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACCESSIBILITY FEATURES - THE STAR OF THE SHOW! */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-6 text-white">
          <h2 className="text-2xl font-bold flex items-center">
            ♿ Accessibility Features
            <span className="ml-3 text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
              {Object.values(hotel.accessibilityFeatures).filter(Boolean).length}/{Object.keys(hotel.accessibilityFeatures).length} Available
            </span>
          </h2>
          <p className="text-green-100 mt-2">Making travel accessible for everyone</p>
        </div>
        
        <div className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AccessibilityFeature
              icon={hotel.accessibilityFeatures.wheelchairAccessible ? '♿' : '🚫'}
              title="Wheelchair Access"
              available={hotel.accessibilityFeatures.wheelchairAccessible}
              description={hotel.accessibilityFeatures.wheelchairAccessible ? 'Wheelchair accessible entrance and facilities' : 'No wheelchair accessibility information found'}
            />
            <AccessibilityFeature
              icon={hotel.accessibilityFeatures.accessibleBathroom ? '🚿' : '🚫'}
              title="Accessible Bathroom"
              available={hotel.accessibilityFeatures.accessibleBathroom}
              description={hotel.accessibilityFeatures.accessibleBathroom ? 'Accessible bathroom facilities available' : 'No accessible bathroom information found'}
            />
            <AccessibilityFeature
              icon={hotel.accessibilityFeatures.elevator ? '🛗' : '🚫'}
              title="Elevator Access"
              available={hotel.accessibilityFeatures.elevator}
              description={hotel.accessibilityFeatures.elevator ? 'Elevator available for upper floors' : 'No elevator information found'}
            />
            <AccessibilityFeature
              icon={hotel.accessibilityFeatures.brailleSignage ? '⠃⠗⠇' : '🚫'}
              title="Braille Signage"
              available={hotel.accessibilityFeatures.brailleSignage}
              description={hotel.accessibilityFeatures.brailleSignage ? 'Braille signage available for visually impaired guests' : 'No braille signage information found'}
            />
            <AccessibilityFeature
              icon={hotel.accessibilityFeatures.publicTransitNearby ? '🚌' : '🚫'}
              title="Public Transit"
              available={hotel.accessibilityFeatures.publicTransitNearby}
              description={hotel.accessibilityFeatures.publicTransitNearby ? 'Accessible public transportation nearby' : 'No public transit information found'}
            />
            <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">📊</div>
                <div>
                  <h3 className="font-semibold text-blue-800">Accessibility Score</h3>
                  <p className="text-sm text-blue-600">
                    {Object.values(hotel.accessibilityFeatures).filter(Boolean).length} out of {Object.keys(hotel.accessibilityFeatures).length} features available
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-lg p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-2">Ready to Book?</h3>
        <p className="mb-4">Visit the hotel website to check availability and make reservations</p>
        <a 
          href={hotel.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-block"
        >
          Visit Hotel Website →
        </a>
      </div>
    </div>
  )
}

// Accessibility Feature Component
function AccessibilityFeature({ icon, title, available, description }: {
  icon: string
  title: string
  available: boolean
  description: string
}) {
  return (
    <div className={`p-4 rounded-lg border-2 ${available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center space-x-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className={`font-semibold ${available ? 'text-green-800' : 'text-red-800'}`}>
            {title}
          </h3>
          <p className={`text-sm ${available ? 'text-green-600' : 'text-red-600'}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}