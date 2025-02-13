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
  conversationHistory?: string;
  files?: Array<{
    path: string;
    content: string;
  }>;
}

function parseArguments(args: unknown): Record<string, unknown> {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.error('Failed to parse JSON string:', error);
      throw new McpError(ErrorCode.InvalidParams, 'Invalid JSON string in arguments');
    }
  }
  
  if (typeof args === 'object' && args !== null) {
    return args as Record<string, unknown>;
  }
  
  console.error('Invalid arguments type:', typeof args);
  throw new McpError(ErrorCode.InvalidParams, 'Arguments must be a JSON object or string');
}

function isAnalysisRequest(args: unknown): args is AnalysisRequest {
  console.error('Validating analysis request, raw args:', args);
  
  try {
    const parsed = parseArguments(args);
    console.error('Parsed arguments:', parsed);

    if (!('context' in parsed)) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required field: context');
    }

    if (typeof parsed.context !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Field "context" must be a string');
    }

    if ('task' in parsed && typeof parsed.task !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Field "task" must be a string when provided');
    }

    return true;
  } catch (error) {
    console.error('Analysis request validation failed:', error);
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InvalidParams, 'Invalid analysis request format');
  }
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
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, error.message || 'Unknown error occurred');
    };

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
          name: 'analyze_and_edit',
          description: 'Analyze code context and generate edits using AI models',
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
              conversationHistory: {
                type: 'string',
                description: 'Optional conversation history for context',
              },
              files: {
                type: 'array',
                description: 'Optional related files for context',
                items: {
                  type: 'object',
                  properties: {
                    path: {
                      type: 'string',
                      description: 'File path',
                    },
                    content: {
                      type: 'string',
                      description: 'File content',
                    },
                  },
                  required: ['path', 'content'],
                },
              },
            },
            required: ['context'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        console.error('Received tool request:', JSON.stringify(request, null, 2));
        
        const { name, arguments: args } = request.params;

        if (!args) {
          console.error('No arguments provided');
          throw new McpError(
            ErrorCode.InvalidParams,
            'Tool arguments are required'
          );
        }

        try {
          switch (name) {
            case 'analyze_and_edit': {
              if (!isAnalysisRequest(args)) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  'Invalid request parameters'
                );
              }
              return this.handleAnalysisAndEdits(args);
            }
            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}`
              );
          }
        } catch (error) {
          console.error('Tool execution error:', error);
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            ErrorCode.InternalError,
            `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    );
  }

  private async handleAnalysisAndEdits(request: AnalysisRequest) {
    const { context, task } = request;
    
    try {
      // Validate context size
      const contextSize = ContextManager.validateContextSize(context);
      if (contextSize.truncated) {
        console.warn('Context was truncated to fit token limits');
      }

      // Format context for model input with additional information
      let fullContext = '';

      // Add conversation history if available
      if (request.conversationHistory) {
        fullContext += 'Previous Conversation:\n';
        fullContext += request.conversationHistory;
        fullContext += '\n\n';
      }

      // Add relevant files if available
      if (request.files) {
        fullContext += 'Related Files:\n';
        for (const file of request.files) {
          fullContext += `File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
        }
      }

      // Add the current code context
      fullContext += 'Current Code:\n';
      fullContext += context;

      const formattedContext = ContextManager.formatContext(fullContext, task);

      // Get analysis and edits
      const result = await this.openRouter.analyzeAndEdit(formattedContext, task);

      // Log success
      await this.auditLogger.logContextAnalysis(
        context,
        contextSize.tokens,
        'success'
      );

      await this.auditLogger.logModelResponse(
        'deepseek',
        result.length,
        'success'
      );

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      // Log failures
      await this.auditLogger.logContextAnalysis(
        context,
        ContextManager.estimateTokens(context),
        'failure',
        error instanceof Error ? error.message : 'Unknown error'
      );

      await this.auditLogger.logModelResponse(
        'deepseek',
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