import { Action } from './action';
import { ExecutionContext } from './execution-context';

export type Handler<Params = any, Result = unknown> = (
  params: Params,
  ctx: ExecutionContext
) => Promise<Result> | Result;

export class HandlerAction<Params = any, Result = unknown> extends Action<Params, Result> {
  constructor(
    id: string,
    params: Params,
    private readonly handler: Handler<Params, Result>
  ) {
    super(id, params);
  }

  protected async run(params: Params, ctx: ExecutionContext): Promise<Result> {
    return this.handler(params, ctx);
  }
}
