import { readConfig } from '../config'
import { cleanTask, runTask } from '../task'

export default async function (taskName: string) {
    const { tasks } = await readConfig()

    if (taskName === 'clean') {
        if (tasks.clean) {
            console.warn('Task "clean" is overidden.')
        } else {
            await cleanTask({ tasks })
            return
        }
    }

    const task = tasks[taskName]

    console.log('[Task]', taskName, '\n')

    console.time('Finished')
    await runTask({ name: taskName, ...task }, { tasks })
    console.log('\nSuccess!')
    console.timeEnd('Finished')
}