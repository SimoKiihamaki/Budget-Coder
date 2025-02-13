export class ContextManager {
  private static TOKENS_PER_CHAR = 0.30;
  private static MAX_TOKENS = 100000;

  /**
   * Estimates the number of tokens in a string
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length * this.TOKENS_PER_CHAR);
  }

  /**
   * Formats the context for model input
   */
  static formatContext(context: string, task?: string): string {
    let formattedContext = '';
    
    if (task) {
      formattedContext += `Task Description:\n${task}\n\n`;
    }

    formattedContext += `Code Context:\n\`\`\`\n${context}\n\`\`\`\n`;
    
    return formattedContext;
  }

  /**
   * Validates if the context size is within acceptable limits
   */
  static validateContextSize(context: string): { tokens: number; truncated: boolean } {
    const tokens = this.estimateTokens(context);
    return {
      tokens,
      truncated: tokens > this.MAX_TOKENS
    };
  }
}