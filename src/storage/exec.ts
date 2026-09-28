import { execSync as _execSync, exec as _exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(_exec);

export function execSync(command: string, args: string[], cwd: string = process.cwd()): string {
  try {
    const result = _execSync(`${command} ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.toString();
  } catch (error: any) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${error.message}`);
  }
}

export async function exec(command: string, args: string[], cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execAsync(`${command} ${args.join(' ')}`, { cwd });
    return stdout;
  } catch (error: any) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${error.message}`);
  }
}