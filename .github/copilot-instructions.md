# GPT Scrape - AI Coding Instructions

## Project Overview
This is a web scraping tool that extracts hotel accessibility features using Playwright for web scraping and OpenAI's GPT models for structured data extraction. The project follows a simple, single-file architecture focused on batch processing hotel websites.

## Architecture & Key Components

### Core Flow
1. **Web Scraping** (`scrape()` function): Uses Playwright chromium to fetch and clean HTML content
2. **AI Extraction** (`extract()` function): Sends cleaned HTML to OpenAI API for structured JSON extraction
3. **Batch Processing** (`run()` function): Iterates through hardcoded URL list with error handling

### Technology Stack
- **Runtime**: Bun (not Node.js) - use `bun` commands, not `npm`
- **Web Scraping**: Playwright with chromium browser
- **AI Processing**: OpenAI API (gpt-4o-mini model for cost efficiency)
- **Language**: TypeScript with ESNext target and bundler module resolution

## Development Workflows

### Essential Commands
```bash
bun install          # Install dependencies
bun run index.ts     # Run the scraper
```

### Environment Setup
- Requires `OPENAI_API_KEY` in `.env` file
- Uses `dotenv` for environment variable loading
- No additional configuration files needed

## Project-Specific Patterns

### HTML Processing Strategy
- **Content Limits**: HTML is truncated to 6000 characters to manage API costs and context limits
- **Text Cleaning**: All whitespace is normalized with `.replace(/\s+/g, " ")`
- **Wait Strategy**: Uses `domcontentloaded` for faster page loading vs full load

### OpenAI Integration Approach
- **Model Choice**: Uses `gpt-4o-mini` for cost optimization (explicitly noted in comment)
- **Response Format**: Uses newer `client.responses.create()` API, not chat completions
- **Temperature**: Set to 0 for consistent extraction results
- **Prompt Engineering**: Structured with clear JSON schema expectations

### Error Handling Pattern
- **Graceful Degradation**: Individual URL failures don't stop batch processing
- **Simple Logging**: Console-based error reporting with URL context
- **No Retries**: Single attempt per URL to avoid cost escalation

### Data Structure
- **Output Format**: Specific accessibility feature JSON schema (wheelchair_accessible, accessible_bathroom, etc.)
- **URL Management**: Hardcoded Canadian hotel URLs in array - modify directly in `run()` function

## Key Files
- `index.ts`: Single entry point containing all application logic
- `package.json`: Bun-specific configuration with Playwright and OpenAI dependencies
- `tsconfig.json`: Modern TypeScript setup with bundler module resolution