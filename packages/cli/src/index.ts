#!/usr/bin/env node
import { Command } from "commander";
import { runCommand } from "./commands/run.ts";
import { listCommand } from "./commands/list.ts";

const program = new Command();

program
  .name("worklift")
  .description("Modern build tool with TypeScript DSL")
  .version("0.1.0");

// Main command: execute targets
program
  .argument("[targets...]", "targets to execute (e.g., build, app:test)", [])
  .option("-f, --file <path>", "build file path", "build.ts")
  .option(
    "-l, --log-level <level>",
    "log level (error|warn|info|debug)",
    "info"
  )
  .option(
    "-v, --verbose",
    "verbose logging (equivalent to --log-level debug)"
  )
  .option("--no-color", "disable colored output (forces simple format)")
  .action(async (targets: string[], options) => {
    await runCommand(targets, options);
  });

// List command: show all projects and targets
program
  .command("list")
  .description("list all projects and targets")
  .option("-f, --file <path>", "build file path", "build.ts")
  .action(async (options) => {
    await listCommand(options);
  });

program.parse();
