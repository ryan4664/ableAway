import { HotelStorage } from '../lib/enhanced_storage'

export const apiController = {
  // Get stats
  getStats: async (c: any) => {
    try {
      const storage = new HotelStorage()
      const stats = storage.getStats()
      storage.close()
      
      return c.json(stats)
    } catch (error) {
      console.error('Failed to get stats:', error)
      return c.json({ message: 'Failed to get stats', status: 'error' }, 500)
    }
  },

  // Get hotels
  getHotels: async (c: any) => {
    try {
      const storage = new HotelStorage()
      const hotels = storage.getAllHotels()
      storage.close()
      
      return c.json(hotels)
    } catch (error) {
      console.error('Failed to get hotels:', error)
      return c.json({ message: 'Failed to get hotels', status: 'error' }, 500)
    }
  }
}