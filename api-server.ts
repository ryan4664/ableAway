import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HotelStorage } from './src/lib/enhanced_storage'

const app = new Hono()

// Enable CORS for the frontend
app.use('*', cors({
  origin: ['http://localhost:3001'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type'],
}))

// API Routes
app.get('/api/domains', async (c) => {
  const storage = new HotelStorage()
  const allHotels = storage.getAllHotels()
  storage.close()

  // Group hotels by domain
  const domainGroups: Record<string, any[]> = {}
  allHotels.forEach(hotel => {
    const domain = new URL(hotel.url).hostname
    if (!domainGroups[domain]) {
      domainGroups[domain] = []
    }
    domainGroups[domain].push(hotel)
  })

  return c.json(domainGroups)
})

app.get('/api/domain/:domain', async (c) => {
  const domain = c.req.param('domain')
  const storage = new HotelStorage()
  const allHotels = storage.getAllHotels()
  const hotels = allHotels.filter(hotel => new URL(hotel.url).hostname === domain)
  storage.close()

  return c.json(hotels)
})

app.get('/api/hotel/:id', async (c) => {
  const hotelId = c.req.param('id')
  const storage = new HotelStorage()
  const hotels = storage.getAllHotels()
  const hotel = hotels.find(h => h.id?.toString() === hotelId)
  storage.close()

  if (!hotel) {
    return c.json({ error: 'Hotel not found' }, 404)
  }

  return c.json(hotel)
})

app.get('/api/stats', async (c) => {
  const storage = new HotelStorage()
  const stats = storage.getStats()
  storage.close()
  
  return c.json(stats)
})

export default {
  port: 3000,
  fetch: app.fetch,
}