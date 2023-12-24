#!/usr/bin/env node
import {resolve} from "node:path"
import process from "node:process"
import fs from "node:fs/promises";
import { Command } from 'commander';

const program = new Command();

const path = resolve(process.cwd(), "package.json")
const file = (await fs.readFile(path)).toString();
const packageJson = JSON.parse(file)
let {tasks} = packageJson.worklift;

program
    .command("list")
    .description("List all available tasks")
    .action(() => {
       for (const task in tasks) {
          console.log(task)
       }
    });

program
    .command("run", { isDefault: true })
    .argument("<task>", "Task to run")
    .action((task) => {
        // run shell command
        const {command} = tasks[task]
        console.log(`Running ${command}`)

    });

program.parse()
