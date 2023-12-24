interface Task {
    name: string;
    command: string | string[];
    depends_on?: string[];
}

function getTasks(): Task[] {

}

function buildTree(tasks: Task[]): void {
    const tree = new Map<string, Task>()

    for (const task of tasks) {
        tree.set(task.name, task)
    }

    for (const task of tasks) {
        if (task.depends_on) {
            for (const dependency of task.depends_on) {
                if (!tree.has(dependency)) {
                    throw new Error(`Task ${task.name} depends on ${dependency} but it does not exist`)
                }
            }
        }
    }
}

export async function runTask(task: Task): Promise<void> {
    const cmd = Array.isArray(task.command) ? task.command : task.command.split(' ')

    console.log('[Exec]', task.command)
    console.time(task.name)

    const proc = Bun.spawn(cmd, {
        stdout: 'inherit',
        stderr: 'inherit',
    })

    await proc.exited

    console.timeEnd(task.name)
}