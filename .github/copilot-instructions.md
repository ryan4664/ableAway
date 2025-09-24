# AbleAway - AI Coding Instructions

## Project Overview
This is an intelligent web scraping system that extracts hotel accessibility features using Playwright for web scraping and OpenAI's GPT models for structured data extraction. The project has evolved from a simple single-file script into a production-ready web application with sophisticated retry logic, historical data tracking, and a modern web interface.

## Architecture & Key Components

### Project Structure
```
src/
├── types.ts                 # Core TypeScript interfaces and enums
├── main.ts                  # Legacy CLI entry point
├── lib/                     # Core business logic
│   ├── enhanced_storage.ts  # SQLite data layer with advanced features
│   ├── scraper.ts          # Parallel processing orchestration
│   ├── worker.ts           # Individual scraping/extraction functions
│   └── retry.ts            # Bulletproof error handling & circuit breakers
├── controllers/            # Hono route controllers (MVC pattern)
│   ├── dashboardController.ts
│   ├── hotelsController.ts
│   ├── urlsController.ts
│   └── apiController.ts
├── ui/                     # JSX components
│   ├── Layout.tsx          # Shared layout with navigation
│   └── components.tsx      # Reusable UI components
└── utils/                  # Utility functions
    └── migrate.ts          # Database migration tools
```

### Core Data Flow
1. **URL Management**: Enhanced `enhanced_storage.ts` maintains URL registry with status tracking
2. **Parallel Scraping**: `scraper.ts` orchestrates concurrent workers with controlled concurrency
3. **Resilient Processing**: `retry.ts` provides exponential backoff and circuit breaker patterns
4. **Data Extraction**: `worker.ts` handles Playwright scraping and OpenAI processing
5. **Web Interface**: Controllers serve JSX-rendered pages with real-time stats
6. **Historical Tracking**: Database stores scrape attempts and changes over time

### Technology Stack
- **Runtime**: Bun (not Node.js) - use `bun` commands, not `npm`
- **Database**: SQLite with Bun's native driver for performance and simplicity
- **Web Framework**: Hono v4.9.8 for blazing-fast server-side JSX rendering
- **Web Scraping**: Playwright with chromium browser automation
- **AI Processing**: OpenAI API (gpt-4o-mini model for cost efficiency)
- **UI Styling**: Tailwind CSS via CDN for responsive design
- **Language**: TypeScript with ESNext target and strict type checking

## Development Workflows

### Essential Commands
```bash
bun install          # Install dependencies
bun run web.ts       # Start web server (development)
bun run src/main.ts  # Run CLI scraper (legacy)
```

### Environment Setup
- Requires `OPENAI_API_KEY` in `.env` file
- Uses `dotenv` for environment variable loading
- SQLite database auto-creates on first run

## Database Architecture

### Enhanced Schema
- **urls**: Central registry with status tracking, retry counts, discovery source
- **scrape_attempts**: Detailed log of every attempt with timing and error data
- **hotel_data**: Current hotel information with accessibility features
- **hotel_data_history**: Historical changes tracking for analysis
- **Indexes**: Optimized for common queries (URL lookups, status filtering, recent data)

### URL Status Flow
```
PENDING → NEEDS_RETRY → SUCCESS/FAILED/BLOCKED
```

## Project-Specific Patterns

### Retry & Resilience Strategy
- **Circuit Breakers**: Domain-level failure protection preventing cascade failures
- **Exponential Backoff**: Intelligent retry timing to avoid overwhelming servers
- **Error Categorization**: Different retry strategies for rate limits vs. permanent failures
- **Statistics Tracking**: Per-domain success/failure rates for monitoring

### Data Processing Approach
- **Content Limits**: HTML truncated to 6000 characters for API cost management
- **Text Cleaning**: Whitespace normalization with `.replace(/\s+/g, " ")`
- **Parallel Processing**: Configurable concurrency (default 3 workers)
- **Historical Tracking**: Automatic change detection and versioning

### OpenAI Integration Patterns
- **Model Choice**: `gpt-4o-mini` for cost optimization
- **Response Format**: Structured JSON extraction with validation
- **Temperature**: Set to 0 for consistent results
- **Error Handling**: Graceful degradation with detailed error logging

### Web Interface Design
- **Server-Side JSX**: Hono + JSX for fast rendering without client complexity
- **Component Architecture**: Reusable Layout and UI components
- **MVC Pattern**: Separated controllers for clean route organization
- **Real-time Updates**: AJAX scraping triggers with visual feedback

## Key Files & Responsibilities

### Core Data Layer
- `src/lib/enhanced_storage.ts`: SQLite operations, URL management, statistics
- `src/types.ts`: TypeScript interfaces for type safety across system

### Processing Engine
- `src/lib/scraper.ts`: Parallel processing coordination and progress tracking
- `src/lib/worker.ts`: Individual URL processing (scrape + extract)
- `src/lib/retry.ts`: Error handling, circuit breakers, retry logic

### Web Application
- `web.ts`: Main Hono application with route definitions
- `src/controllers/`: Route handlers following MVC pattern
- `src/ui/`: JSX components for consistent UI rendering

### Development Tools
- `src/utils/migrate.ts`: Database migration and data transformation
- `src/utils/migrate.ts`: Database migration and data transformation
- `test-system.ts`: System testing and validation scripts

## Error Handling Philosophy

### Graceful Degradation
- Individual URL failures don't stop batch processing
- Circuit breakers prevent cascade failures
- Detailed error logging with categorization
- Automatic retry scheduling based on error type

### Cost Management
- HTML content truncation prevents excessive API usage
- Single extraction attempt per successful scrape
- Efficient database queries with proper indexing
- Background processing to avoid UI blocking

## Deployment Considerations

### Performance Optimizations
- SQLite WAL mode for better concurrent access
- Database connection pooling and proper cleanup
- Controlled concurrency to prevent resource exhaustion
- Indexed queries for fast data retrieval

### Monitoring & Observability
- Comprehensive statistics tracking in database
- Real-time progress reporting during scraping
- Historical data analysis capabilities
- Error rate monitoring per domain

### Future Scaling Options
- Ready for migration to PlanetScale or PostgreSQL
- Worker process separation for horizontal scaling  
- API rate limiting and authentication ready
- Component-based UI for React/Vue migration

This system represents a production-ready evolution from the original simple scraper, incorporating enterprise-grade patterns for reliability, observability, and maintainability while preserving the core mission of accessibility data extraction.