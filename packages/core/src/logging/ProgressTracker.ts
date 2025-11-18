import { clearLine, cursorTo, moveCursor } from "readline";
import { LogLevel, LogEntry } from "./types.ts";
import { InteractiveFormatter } from "./formatters.ts";

interface ProgressLine {
  id: string;
  message: string;
  isActive: boolean;
}

/**
 * Manages multiple progress lines with ANSI escape codes
 * Allows concurrent task progress display
 */
export class ProgressTracker {
  private lines: Map<string, ProgressLine> = new Map();
  private lineOrder: string[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_RATE = 80; // ms
  private linesRendered = 0;

  constructor(
    private formatter: InteractiveFormatter,
    private stream: NodeJS.WriteStream = process.stdout
  ) {}

  /**
   * Start tracking a new progress line
   */
  start(id: string, message: string): void {
    if (!this.lines.has(id)) {
      this.lineOrder.push(id);
    }

    this.lines.set(id, {
      id,
      message,
      isActive: true,
    });

    // Start refresh loop if not running
    if (!this.updateInterval) {
      this.updateInterval = setInterval(
        () => this.render(),
        this.REFRESH_RATE
      );
    }

    this.render();
  }

  /**
   * Update an existing progress line
   */
  update(id: string, message: string): void {
    const line = this.lines.get(id);
    if (line) {
      line.message = message;
      this.render();
    }
  }

  /**
   * Complete a progress line (show checkmark)
   */
  complete(id: string, message?: string): void {
    const line = this.lines.get(id);
    if (line) {
      line.isActive = false;
      if (message) {
        line.message = message;
      }
      this.render();

      // Remove from tracking after a moment
      setTimeout(() => {
        this.lines.delete(id);
        this.lineOrder = this.lineOrder.filter((l) => l !== id);

        // Stop refresh loop if no active lines
        if (this.lines.size === 0 && this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
        }

        this.render();
      }, 100);
    }
  }

  /**
   * Render all progress lines
   */
  private render(): void {
    if (!this.stream.isTTY) return;

    // Move cursor up to start of progress section
    if (this.linesRendered > 0) {
      moveCursor(this.stream, 0, -this.linesRendered);
    }

    // Render each line
    let renderedCount = 0;
    for (const id of this.lineOrder) {
      const line = this.lines.get(id);
      if (line) {
        clearLine(this.stream, 0);
        cursorTo(this.stream, 0);

        const entry: LogEntry = {
          timestamp: new Date(),
          level: LogLevel.INFO,
          message: line.message,
        };

        const formatted = this.formatter.formatProgress(entry, line.isActive);
        this.stream.write(formatted + "\n");
        renderedCount++;
      }
    }

    this.linesRendered = renderedCount;
  }

  /**
   * Stop all progress tracking
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.lines.clear();
    this.lineOrder = [];
    this.linesRendered = 0;
  }
}
