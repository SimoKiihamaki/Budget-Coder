import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

interface ModelResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

interface OpenRouterErrorResponse {
  error: string;
}

interface RateLimits {
  remaining: number;
  reset: number;
}

export class OpenRouterClient {
  private client: AxiosInstance;
  private rateLimits: RateLimits = { remaining: 50, reset: Date.now() + 3600000 };

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/modelcontextprotocol/mcp',
        'X-Title': 'MCP Code Pipeline'
      }
    });

    // Add response interceptor for rate limit tracking
    this.client.interceptors.response.use((response: AxiosResponse) => {
      const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '50');
      const reset = parseInt(response.headers['x-ratelimit-reset'] || '3600');
      
      this.rateLimits = {
        remaining,
        reset: Date.now() + reset * 1000
      };
      
      return response;
    });
  }

  private async checkRateLimit(): Promise<void> {
    if (this.rateLimits.remaining <= 0) {
      const waitTime = this.rateLimits.reset - Date.now();
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)} seconds`);
      }
    }
  }

  async deepseekAnalysis(context: string): Promise<string> {
    await this.checkRateLimit();
    
    try {
      const response = await this.client.post<ModelResponse>('/chat/completions', {
        model: 'deepseek-ai/deepseek-coder-33b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analyst. Analyze the provided code context and generate detailed reasoning about potential changes, improvements, and considerations.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return response.data.choices[0].message.content;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<OpenRouterErrorResponse>;
          throw new Error(`Deepseek analysis failed: ${axiosError.response?.data?.error || axiosError.message}`);
        }
        throw new Error(`Deepseek analysis failed: ${error.message}`);
      }
      throw new Error('Deepseek analysis failed: Unknown error occurred');
    }
  }

  async claudeEdit(context: string, analysis: string): Promise<string> {
    await this.checkRateLimit();
    
    try {
      const response = await this.client.post<ModelResponse>('/chat/completions', {
        model: 'anthropic/claude-2.1-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code editor. Based on the provided context and analysis, generate precise code modifications that implement the suggested changes.'
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nAnalysis:\n${analysis}\n\nPlease provide specific code changes to implement the suggested improvements.`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      return response.data.choices[0].message.content;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<OpenRouterErrorResponse>;
          throw new Error(`Claude edit failed: ${axiosError.response?.data?.error || axiosError.message}`);
        }
        throw new Error(`Claude edit failed: ${error.message}`);
      }
      throw new Error('Claude edit failed: Unknown error occurred');
    }
  }

  getRateLimitInfo(): { remaining: number; resetIn: number } {
    return {
      remaining: this.rateLimits.remaining,
      resetIn: Math.max(0, Math.ceil((this.rateLimits.reset - Date.now()) / 1000))
    };
  }
}