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
        console.log('[Skip]', task.name)
        return
    }

    for (const dep of task.depends_on ?? []) {
        await runTask({ name: dep, ...ctx.tasks[dep] }, ctx)
    }

    const cmd = Array.isArray(task.command) ? task.command : task.command.split(' ')

    console.log('[Exec]', task.command)
    console.time(task.name)

    const proc = Bun.spawn(cmd, {
        stdout: 'inherit',
        stderr: 'inherit',
    })

    await proc.exited

    console.timeEnd(task.name)
    console.log()

    executionKeeper.set(task.name, true)
}