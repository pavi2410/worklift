import { readConfig } from '../config'
import { runTask } from '../task'

export default async function (taskName: string) {
    const { tasks } = await readConfig()

    const task = tasks[taskName]

    console.log('[Task]', taskName)

    await runTask({ name: taskName, ...task })
}