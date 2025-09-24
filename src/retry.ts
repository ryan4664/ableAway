export enum ErrorType {
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error", 
  PARSING_ERROR = "parsing_error",
  AI_EXTRACTION_ERROR = "ai_extraction_error",
  BROWSER_ERROR = "browser_error",
  UNKNOWN_ERROR = "unknown_error",
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export interface DetailedError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  attempt: number;
  url: string;
  timestamp: string;
  retryable: boolean;
}

export class RetryableError extends Error {
  constructor(
    public errorType: ErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export class RetryManager {
  private config: RetryConfig;
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitter: true,
      ...config,
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    url: string,
    context: string = "operation"
  ): Promise<T> {
    const domain = this.extractDomain(url);
    const circuitBreaker = this.getCircuitBreaker(domain);
    
    if (circuitBreaker.isOpen()) {
      throw new RetryableError(
        ErrorType.NETWORK_ERROR,
        `Circuit breaker is open for domain ${domain}`,
        undefined,
        false // Don't retry when circuit is open
      );
    }

    let lastError: DetailedError | null = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success! Reset circuit breaker
        circuitBreaker.recordSuccess();
        return result;
        
      } catch (error) {
        const detailedError = this.categorizeError(error, url, attempt, context);
        lastError = detailedError;
        
        // Record failure in circuit breaker
        circuitBreaker.recordFailure();
        
        console.warn(`⚠️  ${context} failed (attempt ${attempt}/${this.config.maxAttempts}): ${detailedError.message}`);
        
        // Don't retry if error is not retryable or we've hit max attempts
        if (!detailedError.retryable || attempt === this.config.maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        console.log(`⏱️  Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    // All attempts failed
    throw lastError || new RetryableError(ErrorType.UNKNOWN_ERROR, "All retry attempts failed", undefined, false);
  }

  private categorizeError(error: any, url: string, attempt: number, context: string): DetailedError {
    let errorType: ErrorType;
    let retryable = true;
    let message = error?.message || "Unknown error";

    // Categorize based on error patterns
    if (error?.code === "ENOTFOUND" || error?.code === "ECONNREFUSED") {
      errorType = ErrorType.NETWORK_ERROR;
    } else if (error?.code === "ETIMEDOUT" || message.includes("timeout")) {
      errorType = ErrorType.TIMEOUT_ERROR;
    } else if (error?.name === "TimeoutError" || message.includes("Navigation timeout")) {
      errorType = ErrorType.BROWSER_ERROR;
    } else if (message.includes("JSON") || message.includes("parse")) {
      errorType = ErrorType.PARSING_ERROR;
    } else if (context.includes("extract") || message.includes("AI") || message.includes("OpenAI")) {
      errorType = ErrorType.AI_EXTRACTION_ERROR;
    } else if (error?.name === "RetryableError") {
      errorType = error.errorType;
      retryable = error.retryable;
    } else {
      errorType = ErrorType.UNKNOWN_ERROR;
    }

    // Some errors shouldn't be retried
    if (message.includes("401") || message.includes("403") || message.includes("404")) {
      retryable = false;
    }

    return {
      type: errorType,
      message,
      originalError: error,
      attempt,
      url,
      timestamp: new Date().toISOString(),
      retryable,
    };
  }

  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  }

  private getCircuitBreaker(domain: string): CircuitBreaker {
    if (!this.circuitBreakers.has(domain)) {
      this.circuitBreakers.set(domain, new CircuitBreaker());
    }
    return this.circuitBreakers.get(domain)!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get retry statistics
  getStats() {
    const stats = Array.from(this.circuitBreakers.entries()).map(([domain, cb]) => ({
      domain,
      failures: cb.getFailureCount(),
      successes: cb.getSuccessCount(),
      isOpen: cb.isOpen(),
    }));

    return {
      domains: stats,
      totalDomains: stats.length,
      openCircuits: stats.filter(s => s.isOpen).length,
    };
  }
}

class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess() {
    this.successes++;
    this.failures = 0; // Reset failure count on success
  }

  isOpen(): boolean {
    if (this.failures < this.failureThreshold) {
      return false;
    }
    
    // Auto-reset after timeout
    if (Date.now() - this.lastFailureTime > this.resetTimeout) {
      this.failures = 0;
      return false;
    }
    
    return true;
  }

  getFailureCount(): number {
    return this.failures;
  }

  getSuccessCount(): number {
    return this.successes;
  }
}