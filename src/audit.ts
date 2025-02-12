import fs from 'fs/promises';
import path from 'path';

export interface AuditEntry {
  timestamp: string;
  operation: string;
  details: Record<string, unknown>;
  status: 'success' | 'failure';
  error?: string;
}

export class AuditLogger {
  private logDir: string;
  private currentLogFile: string;

  constructor(baseDir: string) {
    this.logDir = path.join(baseDir, 'audit-logs');
    this.currentLogFile = this.generateLogFileName();
  }

  private generateLogFileName(): string {
    const date = new Date();
    const timestamp = date.toISOString().split('T')[0];
    return path.join(this.logDir, `pipeline-${timestamp}.log`);
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  private formatEntry(entry: AuditEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    }, null, 2);
  }

  async log(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    await this.ensureLogDir();

    // Check if we need to rotate to a new log file
    const newLogFile = this.generateLogFileName();
    if (newLogFile !== this.currentLogFile) {
      this.currentLogFile = newLogFile;
    }

    const formattedEntry = this.formatEntry(fullEntry);
    
    try {
      await fs.appendFile(
        this.currentLogFile,
        formattedEntry + '\n---\n',
        'utf8'
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
      throw new Error('Audit logging failed');
    }
  }

  async logContextAnalysis(
    context: string,
    tokenCount: number,
    status: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    await this.log({
      operation: 'context_analysis',
      details: {
        contextSize: context.length,
        estimatedTokens: tokenCount,
        timestamp: new Date().toISOString()
      },
      status,
      error
    });
  }

  async logModelResponse(
    model: 'deepseek' | 'claude',
    responseLength: number,
    status: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    await this.log({
      operation: 'model_response',
      details: {
        model,
        responseLength,
        timestamp: new Date().toISOString()
      },
      status,
      error
    });
  }

  async logCodeEdit(
    filePath: string,
    changeSize: number,
    status: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    await this.log({
      operation: 'code_edit',
      details: {
        file: filePath,
        changeSize,
        timestamp: new Date().toISOString()
      },
      status,
      error
    });
  }

  async getRecentLogs(count: number = 10): Promise<AuditEntry[]> {
    try {
      const content = await fs.readFile(this.currentLogFile, 'utf8');
      return content
        .split('---\n')
        .filter(Boolean)
        .map(entry => JSON.parse(entry))
        .slice(-count);
    } catch (error) {
      console.error('Failed to read audit logs:', error);
      return [];
    }
  }

  async searchLogs(
    criteria: Partial<AuditEntry>,
    limit: number = 100
  ): Promise<AuditEntry[]> {
    try {
      const content = await fs.readFile(this.currentLogFile, 'utf8');
      return content
        .split('---\n')
        .filter(Boolean)
        .map(entry => JSON.parse(entry))
        .filter(entry => {
          return Object.entries(criteria).every(([key, value]) => {
            return entry[key as keyof AuditEntry] === value;
          });
        })
        .slice(-limit);
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      return [];
    }
  }
}