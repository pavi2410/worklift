#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
    .command("list", { isDefault: true })
    .description("List all available tasks")
    .action(() => import('./commands/list.ts').then(m => m.default()));

program
    .command("run")
    .argument("<task>", "Task to run")
    .action((task) => import('./commands/run.ts').then(m => m.default(task)));

program.parse()
