import { ExecutionContext } from './execution-context';
import { Executable } from './executable';

export class Plan extends Executable<unknown[]> {
  private readonly executables: Executable[] = [];

  add(executable: Executable): this {
    this.executables.push(executable);
    return this;
  }

  async execute(ctx: ExecutionContext): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const executable of this.executables) {
      // eslint-disable-next-line no-await-in-loop
      const result = await executable.execute(ctx);
      results.push(result);
    }
    return results;
  }
}
