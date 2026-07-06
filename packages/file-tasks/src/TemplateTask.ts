import { Task } from "@worklift/core";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Configuration for TemplateTask
 */
export interface TemplateTaskConfig {
  /** Template file path */
  from: string;
  /** Output file path */
  to: string;
  /** Variable substitutions for {{name}} placeholders */
  vars?: Record<string, string>;
}

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/**
 * Task for rendering a template file with variable substitution.
 */
export class TemplateTask extends Task {
  private fromPath: string;
  private toPath: string;
  private variables: Record<string, string>;

  constructor(config: TemplateTaskConfig) {
    super();
    this.fromPath = config.from;
    this.toPath = config.to;
    this.variables = config.vars ?? {};
    this.inputs = this.fromPath;
    this.outputs = this.toPath;
  }

  static of(config: TemplateTaskConfig): TemplateTask {
    return new TemplateTask(config);
  }

  override validate() {
    if (!this.fromPath) {
      throw new Error("TemplateTask: 'from' is required");
    }
    if (!this.toPath) {
      throw new Error("TemplateTask: 'to' is required");
    }
  }

  async execute() {
    const template = await readFile(this.fromPath, "utf-8");
    const content = renderTemplate(template, this.variables);
    await mkdir(dirname(this.toPath), { recursive: true });
    await writeFile(this.toPath, content, "utf-8");
  }
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(PLACEHOLDER, (_match, key: string) => {
    if (!(key in vars)) {
      throw new Error(`Template variable not provided: ${key}`);
    }
    return vars[key]!;
  });
}
