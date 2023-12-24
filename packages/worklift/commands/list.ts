import { readConfig } from '../config'

export default async function () {
    const config = await readConfig()

    for (const taskName in config.tasks) {
        console.log('→', taskName)
    }
}