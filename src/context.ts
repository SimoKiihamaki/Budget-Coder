interface TokenCount {
  tokens: number;
  truncated: boolean;
}

interface ContextChunk {
  content: string;
  tokenCount: number;
}

export class ContextManager {
  // Approximate tokens per character (this is a rough estimate)
  private static TOKENS_PER_CHAR = 0.25;
  
  // Target token limits
  private static MIN_TOKENS = 50000;
  private static MAX_TOKENS = 100000;

  /**
   * Estimates the number of tokens in a string
   * Note: This is a rough approximation. For production use,
   * consider using a proper tokenizer like GPT-3's
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length * this.TOKENS_PER_CHAR);
  }

  /**
   * Chunks a large context into manageable pieces
   * Returns the most relevant chunk within token limits
   */
  static createContextChunk(
    mainFile: string,
    dependencies: string[],
    maxTokens: number = this.MAX_TOKENS
  ): ContextChunk {
    // Start with the main file
    let context = mainFile;
    let tokenCount = this.estimateTokens(context);

    // Add dependencies until we approach the token limit
    for (const dep of dependencies) {
      const depTokens = this.estimateTokens(dep);
      
      // If adding this dependency would exceed the limit, skip it
      if (tokenCount + depTokens > maxTokens) {
        continue;
      }

      context += '\n\n' + dep;
      tokenCount += depTokens;
    }

    return {
      content: context,
      tokenCount
    };
  }

  /**
   * Merges analysis results with original context
   * while staying within token limits
   */
  static mergeWithAnalysis(
    originalContext: string,
    analysis: string,
    maxTokens: number = this.MAX_TOKENS
  ): string {
    const originalTokens = this.estimateTokens(originalContext);
    const analysisTokens = this.estimateTokens(analysis);
    
    // If combined content would exceed limits, truncate the original context
    if (originalTokens + analysisTokens > maxTokens) {
      const availableTokens = maxTokens - analysisTokens;
      const charLimit = Math.floor(availableTokens / this.TOKENS_PER_CHAR);
      const truncatedContext = originalContext.slice(0, charLimit);
      
      return `${truncatedContext}\n\nAnalysis:\n${analysis}`;
    }
    
    return `${originalContext}\n\nAnalysis:\n${analysis}`;
  }

  /**
   * Validates if the context size is within acceptable limits
   */
  static validateContextSize(context: string): TokenCount {
    const tokens = this.estimateTokens(context);
    return {
      tokens,
      truncated: tokens > this.MAX_TOKENS
    };
  }

  /**
   * Formats the context for model input
   */
  static formatContext(
    files: { path: string; content: string }[],
    task?: string
  ): string {
    let context = '';
    
    if (task) {
      context += `Task Description:\n${task}\n\n`;
    }

    context += 'Files to analyze:\n\n';
    
    for (const file of files) {
      context += `File: ${file.path}\n`;
      context += '```\n';
      context += file.content;
      context += '\n```\n\n';
    }

    return context;
  }

  /**
   * Extracts file paths and their contents from a context string
   */
  static extractFilesFromContext(context: string): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    const fileRegex = /File: (.*?)\n```\n([\s\S]*?)\n```/g;
    
    let match;
    while ((match = fileRegex.exec(context)) !== null) {
      files.push({
        path: match[1],
        content: match[2]
      });
    }
    
    return files;
  }
}