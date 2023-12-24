#!/usr/bin/env node
import {resolve} from "node:path"
import process from "node:process"
import fs from "node:fs/promises";
import { Command } from 'commander';

const program = new Command();

const path = resolve(process.cwd(), "package.json")
console.log('looking for package.json at', path)
const packageJson = await Bun.file(path).json()
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
    .argument("[task]", "Task to run", "default")
    .action((task) => {
        // run shell command
        const command = tasks[task] ?? "__all__"

        if (command === "__all__") {
          for (const task in tasks) {
            if (task === "default") continue
            console.log(`Running ${task} ${tasks[task]}`)
          }
          return
        }

        console.log(`Running ${task} ${command}`)

    });

program.parse()
