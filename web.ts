import { Hono } from 'hono'
import { urlsController, domainDetailController, hotelDetailController } from './src/controllers/urlsController'
import { apiController } from './src/controllers/apiController'

const app = new Hono()

// API Routes (keep for data fetching)
app.get('/api/stats', apiController.getStats)
app.get('/api/hotels', apiController.getHotels)

// Main page - Simple URLs list with search
app.get('/', urlsController)
// Domain detail page
app.get('/domain/:domain', domainDetailController)
// Individual hotel detail page
app.get('/hotel/:id', hotelDetailController)

export default app