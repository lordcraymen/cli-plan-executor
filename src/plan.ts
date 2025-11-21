import { Action } from './action';
import { ExecutionContext } from './execution-context';
import { Executable } from './executable';

export class Plan extends Action<void, unknown[]> {
  private readonly executables: Executable[] = [];

  constructor(id: string) {
    super(id, undefined);
  }

  add(executable: Executable): this {
    this.executables.push(executable);
    return this;
  }

  protected async run(_params: void, ctx: ExecutionContext): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const executable of this.executables) {
      // eslint-disable-next-line no-await-in-loop
      const result = await executable.execute(ctx);
      results.push(result);
    }
    return results;
  }

  describe(): string {
    return `${this.id} [${this.executables.map(e => e.id).join(', ')}]`;
  }
}
