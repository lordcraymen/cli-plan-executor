import { ExecutionContext } from './execution-context';
import { Executable } from './executable';
import { ParamMeta } from './params';

export abstract class Action<Params = any, Result = unknown> extends Executable<Result> {
  constructor(
    id: string,
    public readonly params: Params,
    public readonly paramsMeta?: ParamMeta<Params>
  ) {
    super(id);
  }

  describe(): string {
    return `${this.id}(${JSON.stringify(this.params)})`;
  }

  async execute(ctx: ExecutionContext): Promise<Result> {
    if (ctx.dryRun) {
      const description = this.describe();
      // eslint-disable-next-line no-console
      console.log(`[dry-run][action:${this.id}] ${description}`);
      return Promise.resolve(undefined as unknown as Result);
    }

    return this.run(this.params, ctx);
  }

  protected abstract run(params: Params, ctx: ExecutionContext): Promise<Result>;
}
