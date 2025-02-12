#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenRouterClient } from './openrouter.js';
import { ContextManager } from './context.js';
import { AuditLogger } from './audit.js';
import path from 'path';

// Ensure API key is available
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

interface AnalysisRequest {
  context: string;
  task?: string;
}

interface EditRequest {
  context: string;
  analysis: string;
}

function isAnalysisRequest(obj: unknown): obj is AnalysisRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'context' in obj &&
    typeof (obj as any).context === 'string' &&
    (!(obj as any).task || typeof (obj as any).task === 'string')
  );
}

function isEditRequest(obj: unknown): obj is EditRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'context' in obj &&
    'analysis' in obj &&
    typeof (obj as any).context === 'string' &&
    typeof (obj as any).analysis === 'string'
  );
}

class CodePipelineServer {
  private server: Server;
  private openRouter: OpenRouterClient;
  private auditLogger: AuditLogger;

  constructor() {
    this.server = new Server(
      {
        name: 'code-pipeline-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.openRouter = new OpenRouterClient(OPENROUTER_API_KEY);
    this.auditLogger = new AuditLogger(path.join(process.cwd(), 'logs'));

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'pipeline://audit/latest',
          name: 'Latest audit logs',
          description: 'Most recent pipeline operations and their results',
          mimeType: 'application/json',
        },
      ],
    }));

    // Resource templates for dynamic resources
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'pipeline://audit/logs/{date}',
            name: 'Audit logs by date',
            description: 'Pipeline operation logs for a specific date',
            mimeType: 'application/json',
          },
        ],
      })
    );

    // Read resource content
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        if (uri === 'pipeline://audit/latest') {
          const logs = await this.auditLogger.getRecentLogs();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(logs, null, 2),
              },
            ],
          };
        }

        const logsMatch = uri.match(/^pipeline:\/\/audit\/logs\/(\d{4}-\d{2}-\d{2})$/);
        if (logsMatch) {
          const date = logsMatch[1];
          const logs = await this.auditLogger.searchLogs({
            timestamp: new RegExp(`^${date}`),
          } as any);

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(logs, null, 2),
              },
            ],
          };
        }

        throw new McpError(
          ErrorCode.InvalidRequest,
          `Invalid resource URI: ${uri}`
        );
      }
    );
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_code',
          description: 'Analyze code context using Deepseek model',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'string',
                description: 'Code context to analyze',
              },
              task: {
                type: 'string',
                description: 'Optional task description',
              },
            },
            required: ['context'],
          },
        },
        {
          name: 'generate_edits',
          description: 'Generate code edits using Claude model',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'string',
                description: 'Original code context',
              },
              analysis: {
                type: 'string',
                description: 'Analysis from Deepseek',
              },
            },
            required: ['context', 'analysis'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Tool arguments are required'
          );
        }

        switch (name) {
          case 'analyze_code': {
            if (!isAnalysisRequest(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid analysis request parameters'
              );
            }
            return this.handleAnalysis(args);
          }
          case 'generate_edits': {
            if (!isEditRequest(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid edit request parameters'
              );
            }
            return this.handleEdits(args);
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      }
    );
  }

  private async handleAnalysis(request: AnalysisRequest) {
    const { context, task } = request;
    
    try {
      // Validate and prepare context
      const contextSize = ContextManager.validateContextSize(context);
      if (contextSize.truncated) {
        console.warn('Context was truncated to fit token limits');
      }

      // Format context for model input
      const files = ContextManager.extractFilesFromContext(context);
      const formattedContext = ContextManager.formatContext(files, task);

      // Get analysis from Deepseek
      const analysis = await this.openRouter.deepseekAnalysis(formattedContext);

      // Log success
      await this.auditLogger.logContextAnalysis(
        context,
        contextSize.tokens,
        'success'
      );

      return {
        content: [
          {
            type: 'text',
            text: analysis,
          },
        ],
      };
    } catch (error) {
      // Log failure
      await this.auditLogger.logContextAnalysis(
        context,
        ContextManager.estimateTokens(context),
        'failure',
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  private async handleEdits(request: EditRequest) {
    const { context, analysis } = request;

    try {
      // Merge context with analysis
      const mergedContext = ContextManager.mergeWithAnalysis(
        context,
        analysis
      );

      // Get edits from Claude
      const edits = await this.openRouter.claudeEdit(
        context,
        analysis
      );

      // Log success
      await this.auditLogger.logModelResponse(
        'claude',
        edits.length,
        'success'
      );

      return {
        content: [
          {
            type: 'text',
            text: edits,
          },
        ],
      };
    } catch (error) {
      // Log failure
      await this.auditLogger.logModelResponse(
        'claude',
        0,
        'failure',
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Pipeline MCP server running on stdio');
  }
}

const server = new CodePipelineServer();
server.run().catch(console.error);