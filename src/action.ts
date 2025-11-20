import { ExecutionContext } from './execution-context';
import { Executable } from './executable';
import { ParamMeta } from './params';

export abstract class Action<Params = any, Result = unknown> {
  constructor(public readonly id: string, public readonly paramsMeta?: ParamMeta<Params>) {}

  describe(params: Params): string {
    return `${this.id}(${JSON.stringify(params)})`;
  }

  createStepFromParams(stepId: string, params: Params): Step<Params, Result> {
    return new Step(stepId, this, params);
  }

  abstract run(params: Params, ctx: ExecutionContext): Promise<Result>;
}

export class Step<Params = any, Result = unknown> extends Executable<Result> {
  constructor(
    id: string,
    public readonly action: Action<Params, Result>,
    public readonly params: Params
  ) {
    super(id);
  }

  async execute(ctx: ExecutionContext): Promise<Result> {
    if (ctx.dryRun) {
      const description = this.action.describe(this.params);
      // eslint-disable-next-line no-console
      console.log(`[dry-run][step:${this.id}] ${description}`);
      return Promise.resolve(undefined as unknown as Result);
    }

    return this.action.run(this.params, ctx);
  }
}
