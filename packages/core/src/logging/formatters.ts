import type { LogEntry, LogFormatter } from "./types.ts";
import { LogLevel } from "./types.ts";
import { ExternalCommandError } from "../errors.ts";

/**
 * Simple format: ${message}
 * Used when --no-color or piping output
 */
export class SimpleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return entry.message;
  }

  supportsProgress(): boolean {
    return false;
  }
}

/**
 * Verbose format: ${timestamp} [${level}] [${projectName}:${targetName}] ${message}
 * Used with --verbose flag
 */
export class VerboseFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = this.formatLevel(entry.level);
    const context = this.formatContext(entry);

    let output = `${timestamp} [${level}] [${context}] ${entry.message}`;

    if (entry.error) {
      // For external command errors, only show the message (no stacktrace)
      if (entry.error instanceof ExternalCommandError) {
        output += "\n" + entry.error.message;
      } else {
        output += "\n" + (entry.error.stack || entry.error.message);
      }
    }

    return output;
  }

  private formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return "ERROR";
      case LogLevel.WARN:
        return "WARN";
      case LogLevel.INFO:
        return "INFO";
      case LogLevel.DEBUG:
        return "DEBUG";
    }
  }

  private formatContext(entry: LogEntry): string {
    if (entry.projectName && entry.targetName) {
      return `${entry.projectName}:${entry.targetName}`;
    } else if (entry.targetName) {
      return entry.targetName;
    } else if (entry.projectName) {
      return entry.projectName;
    }
    return "worklift";
  }

  supportsProgress(): boolean {
    return false;
  }
}

/**
 * Interactive format: ANSI progress tracking with spinners and colors
 * Default format when output is a TTY
 */
export class InteractiveFormatter implements LogFormatter {
  private spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private spinnerIndex = 0;

  format(entry: LogEntry): string {
    const level = this.formatLevel(entry.level);

    let output = `${level} ${entry.message}`;

    if (entry.error) {
      // For external command errors, only show the message (no stacktrace)
      if (entry.error instanceof ExternalCommandError) {
        output += "\n" + this.colorRed(entry.error.message);
      } else {
        output += "\n" + this.colorRed(entry.error.stack || entry.error.message);
      }
    }

    return output;
  }

  /**
   * Format a progress message (for updating in place)
   */
  formatProgress(entry: LogEntry, isActive: boolean = true): string {
    const spinner = isActive ? this.getSpinner() : this.colorGreen("✓");
    const target = entry.targetName ? this.colorCyan(`[${entry.targetName}]`) : "";
    return `${spinner} ${target} ${entry.message}`;
  }

  private formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return this.colorRed("✗");
      case LogLevel.WARN:
        return this.colorYellow("⚠");
      case LogLevel.INFO:
        return this.colorBlue("→");
      case LogLevel.DEBUG:
        return this.colorGray("·");
    }
  }

  private getSpinner(): string {
    const frame = this.spinnerFrames[this.spinnerIndex];
    if (!frame) {
      return "";
    }
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    return this.colorCyan(frame);
  }

  // Simple color helpers (chalk-like but inline)
  private colorRed(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
  }

  private colorGreen(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
  }

  private colorYellow(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
  }

  private colorBlue(text: string): string {
    return `\x1b[34m${text}\x1b[0m`;
  }

  private colorCyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
  }

  private colorGray(text: string): string {
    return `\x1b[90m${text}\x1b[0m`;
  }

  supportsProgress(): boolean {
    return true;
  }
}
