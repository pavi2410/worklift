import { resolve } from "node:path"
import process from "node:process"

interface WorkliftConfig {
    tasks: Record<string, {
        command: string | string[];
        depends_on?: string[];
    }>;
}

interface TaskDef {
    
}

export async function readConfig(): Promise<WorkliftConfig> {
    const path = resolve(process.cwd(), "package.json")
    console.log('looking for package.json at', path)
    const packageJson = await Bun.file(path).json()
    if (!packageJson.worklift)
        throw new Error("package.json does not contain a worklift config")
    return packageJson.worklift as WorkliftConfig;
}
