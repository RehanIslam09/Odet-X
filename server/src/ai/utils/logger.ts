/**
 * A lightweight structured logger for the AI module.
 * Logs are output as JSON for easy parsing by external tools.
 */

export interface AILogMetadata {
  executionId: string;
  provider: string;
  model: string;
  promptName: string;
  promptVersion: string;
  executionTimeMs: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
}

export const aiLogger = {
  /**
   * Logs a completed AI request execution.
   */
  logExecution(metadata: AILogMetadata): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: metadata.success ? 'info' : 'error',
      module: 'AI',
      ...metadata,
    };
    
    if (metadata.success) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.error(JSON.stringify(logEntry));
    }
  },
};
