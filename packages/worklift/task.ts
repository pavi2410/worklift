import type { TaskDef } from './config'

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