import { Action } from './action';
import { ExecutionContext } from './execution-context';

export type CommandBuilder<Params = any> = (params: Params) => string;

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export class CommandLineAction<Params = { command: string }> extends Action<Params, CommandResult> {
  constructor(
    id: string,
    params: Params,
    private readonly commandBuilder: CommandBuilder<Params> = (params: any) => (params as any).command
  ) {
    super(id, params);
  }

  describe(): string {
    const command = this.commandBuilder(this.params);
    return command;
  }

  protected async run(params: Params, ctx: ExecutionContext): Promise<CommandResult> {
    const command = this.commandBuilder(params);
    const env = { ...process.env, ...ctx.env };
    const { exec } = await import('child_process');

    return new Promise<CommandResult>((resolve, reject) => {
      exec(command, { cwd: ctx.cwd, env }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }
}
