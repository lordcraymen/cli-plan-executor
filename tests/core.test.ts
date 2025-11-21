import { describe, it, expect, vi } from 'vitest';
import {
  Action,
  CommandLineAction,
  ExecutionContext,
  HandlerAction,
  Plan,
} from '../src';

describe('Action', () => {
  it('provides a default description', () => {
    class SampleAction extends Action<{ value: string }, string> {
      protected async run(params: { value: string }): Promise<string> {
        return params.value;
      }
    }

    const action = new SampleAction('sample', { value: 'abc' });
    expect(action.describe()).toBe('sample({"value":"abc"})');
  });

  it('executes the action with provided params', async () => {
    const ctx: ExecutionContext = { cwd: process.cwd() };
    const handler = vi.fn().mockResolvedValue('ok');
    const action = new HandlerAction('handler', { foo: 'bar' }, handler);

    const result = await action.execute(ctx);

    expect(handler).toHaveBeenCalledWith({ foo: 'bar' }, ctx);
    expect(result).toBe('ok');
  });

  it('logs description in dry-run mode', async () => {
    const ctx: ExecutionContext = { cwd: process.cwd() };
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const action = new HandlerAction('handler', { foo: 'bar' }, async () => 'ok');

    await action.execute({ ...ctx, dryRun: true });

    expect(logSpy).toHaveBeenCalledWith(
      '[dry-run][action:handler] handler({"foo":"bar"})'
    );

    logSpy.mockRestore();
  });
});

describe('Plan', () => {
  const ctx: ExecutionContext = { cwd: process.cwd() };

  it('executes contained actions sequentially', async () => {
    const order: string[] = [];

    const first = new HandlerAction('first', {}, async () => {
      order.push('first');
      return 'first-result';
    });

    const second = new HandlerAction('second', {}, async () => {
      order.push('second');
      return 'second-result';
    });

    const plan = new Plan('test-plan').add(first).add(second);

    const results = await plan.execute(ctx);

    expect(order).toEqual(['first', 'second']);
    expect(results).toEqual(['first-result', 'second-result']);
  });
});

describe('CommandLineAction', () => {
  it('builds commands from params for description and execution', async () => {
    const builder = vi.fn((params: { command: string }) => params.command);
    const action = new CommandLineAction<{ command: string }>('cmd', { command: 'echo "hello"' }, builder);

    const ctx: ExecutionContext = { cwd: process.cwd(), env: { TEST_ENV: '1' } };

    const describeResult = action.describe();
    expect(describeResult).toBe('echo "hello"');

    // Mock child_process.exec
    const execMock = vi.fn((cmd: string, _options: any, cb: any) => {
      cb(null, 'hello\n', '');
    });

    vi.doMock('child_process', () => ({ exec: execMock }));

    const { stdout, stderr } = await action.execute(ctx);

    expect(builder).toHaveBeenCalledWith({ command: 'echo "hello"' });
    expect(execMock).toHaveBeenCalled();
    expect(stdout.trim()).toBe('hello');
    expect(stderr).toBe('');
  });
});
