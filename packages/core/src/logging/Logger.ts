import type { LogEntry, LogFormatter } from "./types.ts";
import { LogLevel } from "./types.ts";
import {
  SimpleFormatter,
  VerboseFormatter,
  InteractiveFormatter,
} from "./formatters.ts";
import { ProgressTracker } from "./ProgressTracker.ts";

export enum LogFormat {
  SIMPLE = "simple",
  VERBOSE = "verbose",
  INTERACTIVE = "interactive",
}

export interface LoggerOptions {
  level: LogLevel;
  format: LogFormat;
  useColor?: boolean;
  stream?: NodeJS.WriteStream;
}

export class Logger {
  private static instance: Logger | null = null;

  private formatter: LogFormatter;
  private progressTracker?: ProgressTracker;
  private contextStack: Array<{ projectName?: string; targetName?: string }> =
    [];

  private constructor(
    private level: LogLevel,
    private format: LogFormat,
    private useColor: boolean = true,
    private stream: NodeJS.WriteStream = process.stdout
  ) {
    this.formatter = this.createFormatter();

    // Initialize progress tracker for interactive mode
    if (format === LogFormat.INTERACTIVE && stream.isTTY) {
      this.progressTracker = new ProgressTracker(
        this.formatter as InteractiveFormatter,
        stream
      );
    }
  }

  private createFormatter(): LogFormatter {
    switch (this.format) {
      case LogFormat.SIMPLE:
        return new SimpleFormatter();
      case LogFormat.VERBOSE:
        return new VerboseFormatter();
      case LogFormat.INTERACTIVE:
        return new InteractiveFormatter();
    }
  }

  static create(options: LoggerOptions): Logger {
    Logger.instance = new Logger(
      options.level,
      options.format,
      options.useColor ?? true,
      options.stream ?? process.stdout
    );
    return Logger.instance;
  }

  static get(): Logger {
    if (!Logger.instance) {
      // Default to interactive if TTY, simple otherwise
      const format = process.stdout.isTTY
        ? LogFormat.INTERACTIVE
        : LogFormat.SIMPLE;
      Logger.instance = new Logger(LogLevel.INFO, format);
    }
    return Logger.instance;
  }

  /**
   * Push context onto stack (for nested project/target execution)
   */
  pushContext(context: { projectName?: string; targetName?: string }): void {
    this.contextStack.push(context);
  }

  /**
   * Pop context from stack
   */
  popContext(): void {
    this.contextStack.pop();
  }

  /**
   * Get current context
   */
  private getCurrentContext() {
    return this.contextStack.length > 0
      ? this.contextStack[this.contextStack.length - 1]
      : {};
  }

  // Standard logging methods

  error(message: string, error?: Error): void {
    if (this.level >= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, error);
    }
  }

  warn(message: string): void {
    if (this.level >= LogLevel.WARN) {
      this.log(LogLevel.WARN, message);
    }
  }

  info(message: string): void {
    if (this.level >= LogLevel.INFO) {
      this.log(LogLevel.INFO, message);
    }
  }

  debug(message: string): void {
    if (this.level >= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message);
    }
  }

  // Progress tracking methods (for interactive mode)

  startProgress(id: string, message: string): void {
    if (this.progressTracker) {
      this.progressTracker.start(id, message);
    } else {
      this.info(message);
    }
  }

  updateProgress(id: string, message: string): void {
    if (this.progressTracker) {
      this.progressTracker.update(id, message);
    }
  }

  completeProgress(id: string, message?: string): void {
    if (this.progressTracker) {
      this.progressTracker.complete(id, message);
    } else if (message) {
      this.info(message);
    }
  }

  private log(level: LogLevel, message: string, error?: Error): void {
    const context = this.getCurrentContext();

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      projectName: context?.projectName,
      targetName: context?.targetName,
      error,
    };

    const formatted = this.formatter.format(entry);
    this.stream.write(formatted + "\n");
  }

  /**
   * Stop all progress tracking (cleanup)
   */
  shutdown(): void {
    if (this.progressTracker) {
      this.progressTracker.stop();
    }
  }
}
