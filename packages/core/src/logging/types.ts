export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  projectName?: string;
  targetName?: string;
  taskName?: string;
  error?: Error;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
  supportsProgress(): boolean;
}

export interface LogWriter {
  write(formatted: string): void;
  clear?(): void;
  updateLine?(formatted: string): void;
}
