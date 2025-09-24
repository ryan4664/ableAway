# AbleAway - Intelligent Hotel Accessibility Scraper

An intelligent web scraping system that extracts hotel accessibility features using Playwright and OpenAI, with smart retry logic, parallel processing, historical data tracking, and a modern web interface.

## Features

🚀 **Parallel Processing** - Concurrent scraping with configurable workers
🧠 **Smart Retry Logic** - Exponential backoff, circuit breakers, error categorization  
📊 **URL Management** - Central registry with priority and status tracking
🔄 **Historical Tracking** - Monitor data changes and scraping performance over time
💾 **Enhanced Storage** - SQLite with detailed analytics and reporting
🛡️ **Bulletproof Error Handling** - Categorized errors, automatic recovery strategies
🌐 **Web Interface** - Modern dashboard with real-time stats and controls
♿ **Accessibility Focus** - Dedicated to making travel more accessible

## Quick Start

### 1. Install dependencies
```bash
bun install
```

### 2. Set up environment
Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

### 3. Start the application
```bash
# Start API server (port 3000)
bun run api

# In another terminal, start client (port 3001)
bun run client
```

Visit `http://localhost:3001` to access the AbleAway dashboard.

### 4. Or run CLI scraper (legacy)
```bash
bun run src/main.ts
```

## Commands

- `bun run api` - Start the API server (port 3000)
- `bun run client` - Start the Preact frontend (port 3001)
- `bun run build` - Build production client
- `bun run src/main.ts` - Run CLI scraper (legacy)
- Database auto-initializes on first run

## Architecture

### Project Structure
```
AbleAway/
├── api-server.ts               # API server (Hono + CORS)
├── client/                     # Preact SPA frontend
│   ├── App.tsx                # Main Preact application
│   ├── main.tsx               # Preact entry point
│   └── index.html             # HTML template
├── src/
│   ├── main.ts                 # CLI entry point (legacy)
│   ├── types.ts                # TypeScript interfaces
│   ├── lib/                    # Core business logic
│   │   ├── enhanced_storage.ts # SQLite data layer
│   │   ├── scraper.ts         # Parallel processing orchestration
│   │   ├── worker.ts          # Individual scraping & extraction
│   │   └── retry.ts           # Error handling & circuit breakers
│   └── utils/                 # Migration tools
│       └── migrate.ts         # Database utilities
├── vite.config.ts              # Vite configuration with API proxy
└── web.ts                      # Legacy Hono server
```

### Web Interface (Preact SPA)
- **Home Page**: Domain overview with search and accessibility scores
- **Domain Pages**: Hotel listings with accessibility statistics
- **Hotel Details**: Complete accessibility feature breakdown
- **API Integration**: Seamless frontend-backend communication via proxy
- **Responsive Design**: Beautiful gradient UI with Tailwind CSS

## Database Schema

The system uses SQLite with enhanced tables for:
- **urls** - Central URL registry with status tracking, retry counts, discovery source
- **scrape_attempts** - Detailed log of every scraping attempt with timing data
- **hotel_data** - Current best data for each hotel with accessibility features
- **hotel_data_history** - Historical snapshots for change detection and analysis

## Technology Stack

- **Runtime**: Bun v1.2+ (JavaScript runtime optimized for speed)
- **Frontend**: Preact v10.27+ (lightweight React alternative) + Vite v7.1+
- **Backend**: Hono v4.9+ API server with CORS support
- **Database**: SQLite with Bun's native driver
- **Web Scraping**: Playwright with chromium automation
- **AI Processing**: OpenAI API (gpt-4o-mini model for cost efficiency)
- **UI Styling**: Tailwind CSS v4.1+ via CDN
- **Language**: TypeScript with strict type checking
- **Architecture**: SPA with API proxy (client:3001 → api:3000)

## AI Extraction

Uses OpenAI's `gpt-4o-mini` model to extract structured accessibility data:
- ♿ Wheelchair accessibility
- 🚿 Accessible bathrooms  
- 👂 Hearing accessibility features
- 👁️ Visual accessibility features
- 🦽 General mobility accessibility
- 🏨 Hotel amenities and location data

## API Endpoints (Port 3000)

- `GET /api/domains` - Get all domains with their hotels
- `GET /api/domain/:domain` - Get hotels for a specific domain
- `GET /api/hotel/:id` - Get detailed hotel information
- `GET /api/stats` - Get system statistics

## Frontend Routes (Port 3001)

- `/` - Home page with domain overview
- Client-side routing for domain and hotel detail views
- Real-time search and filtering

Built with ♿ accessibility in mind using [Bun](https://bun.com) - a fast all-in-one JavaScript runtime.
