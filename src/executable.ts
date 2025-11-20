import { ExecutionContext } from './execution-context';

export abstract class Executable<Result = unknown> {
  constructor(public readonly id: string) {}

  abstract execute(ctx: ExecutionContext): Promise<Result>;
}
