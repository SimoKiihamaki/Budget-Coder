import { OpenAI } from 'openai';

export class OpenRouterClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/modelcontextprotocol/mcp',
        'X-Title': 'MCP Code Pipeline'
      }
    });
  }

  async analyzeAndEdit(context: string, task?: string): Promise<string> {
    try {
      // Get analysis from Deepseek
      console.debug('Requesting Deepseek analysis...');
      const deepseekPrompt = `You are an expert data analyst and software developer, fluent in multiple programming languages and frameworks. You excel at understanding complex codebases and making precise, thoughtful improvements.

Project Context:
${context}

Task: ${task || 'Analyze and improve the code'}

Analyze the code and provide detailed insights about potential improvements, focusing on:
1. Code structure and organization
2. Performance optimization
3. Error handling
4. Best practices
5. Type safety and validation

Provide your analysis in a clear, professional manner.`;

      const analysis = await this.client.chat.completions.create({
        model: 'deepseek/deepseek-r1:free',
        messages: [
          { role: 'system', content: deepseekPrompt },
          { role: 'user', content: context }
        ],
        temperature: 0.7
      });

      const deepseekResponse = analysis.choices[0]?.message?.content;
      if (!deepseekResponse) {
        throw new Error('No analysis received from Deepseek');
      }

      console.debug('Deepseek analysis obtained');

      // Get edits from Claude
      console.debug('Requesting Claude edits...');
      const claudePrompt = `You are an expert software developer with deep knowledge of best practices and design patterns. Review the following code and analysis to make precise, thoughtful improvements.

Project Context:
${context}

Previous Analysis:
${deepseekResponse}

Task: ${task || 'Review and improve the code'}

Based on the analysis, suggest specific code improvements that will:
1. Enhance code quality and maintainability
2. Improve performance and efficiency
3. Strengthen error handling and type safety
4. Follow industry best practices

Provide your suggested improvements in a clear, professional manner.`;

      const edits = await this.client.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: claudePrompt },
          { role: 'user', content: context }
        ],
        temperature: 0.7
      });

      const claudeResponse = edits.choices[0]?.message?.content;
      if (!claudeResponse) {
        throw new Error('No edits received from Claude');
      }

      return claudeResponse;
    } catch (error) {
      console.error('Analysis and edit failed:', error);
      throw new Error(`Analysis and edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}