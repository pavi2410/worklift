import { readConfig } from '../config'
import { runTask } from '../task'

export default async function (taskName: string) {
    const { tasks } = await readConfig()

    const task = tasks[taskName]

    console.log('[Task]', taskName, '\n')

    console.time('Finished')
    await runTask({ name: taskName, ...task }, { tasks })
    console.log('\nSuccess!')
    console.timeEnd('Finished')
}