import type { TaskDef } from './config'
import fs from 'node:fs/promises'
import { Glob } from "bun";

interface Task extends TaskDef {
    name: string;
}

interface WorkliftContext {
    tasks: Record<string, TaskDef>;
}

const executionKeeper = new Map<string, boolean>()

export async function runTask(task: Task, ctx: WorkliftContext): Promise<void> {
    if (executionKeeper.get(task.name)) {
        console.log('[Skip]', task.name, '\n')
        return
    }

    for (const dep of task.depends_on ?? []) {
        await runTask({ name: dep, ...ctx.tasks[dep] }, ctx)
    }

    console.log('[Exec]', task.command)
    console.time(task.name)

    const taskCommand = process.platform === 'win32' ? task.command__windows : task.command
    const cmd = Array.isArray(taskCommand) ? taskCommand : (
        process.platform === 'win32' ?
            ['powershell', '-command', taskCommand] :
            ['bash', '-c', taskCommand]
    )

    const proc = Bun.spawn(cmd, {
        stdout: 'inherit',
        stderr: 'inherit',
    })

    await proc.exited

    if (proc.exitCode !== 0) {
        console.error(`Task ${task.name} failed with exit code ${proc.exitCode}`)
        return process.exit()
    }

    console.timeEnd(task.name)
    console.log()

    executionKeeper.set(task.name, true)
}

export async function cleanTask(ctx: WorkliftContext) {
    const { tasks } = ctx

    let cleanCounter = 0;

    for (const taskName in tasks) {
        console.log('[Clean]', taskName)
        const task = tasks[taskName]
        if (task.output) {
            for (const output of task.output) {
                const glob = new Glob(output);

                for await (const file of glob.scan({ dot: true })) {
                    console.log(file);
                    await fs.unlink(file);
                    cleanCounter++;
                }
            }
        }
    }

    if (cleanCounter == 0) {
        console.log('\nNothing to clean.')
    } else {
        console.log(`\nCleaned ${cleanCounter} files.`)
    }
}