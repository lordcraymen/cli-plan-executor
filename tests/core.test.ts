import { describe, it, expect, vi } from 'vitest';
import {
  Action,
  CommandLineAction,
  ExecutionContext,
  HandlerAction,
  Plan,
  Step,
} from '../src';

describe('Action', () => {
  it('provides a default description', () => {
    class SampleAction extends Action<{ value: string }, string> {
      async run(params: { value: string }): Promise<string> {
        return params.value;
      }
    }

    const action = new SampleAction('sample');
    expect(action.describe({ value: 'abc' })).toBe('sample({"value":"abc"})');
  });
});

describe('Step', () => {
  const ctx: ExecutionContext = { cwd: process.cwd() };

  it('executes the action with provided params', async () => {
    const handler = vi.fn().mockResolvedValue('ok');
    const action = new HandlerAction('handler', handler);
    const step = new Step('step-1', action, { foo: 'bar' });

    const result = await step.execute(ctx);

    expect(handler).toHaveBeenCalledWith({ foo: 'bar' }, ctx);
    expect(result).toBe('ok');
  });

  it('logs description in dry-run mode', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const action = new HandlerAction('handler', async () => 'ok');
    const step = new Step('step-2', action, { foo: 'bar' });

    await step.execute({ ...ctx, dryRun: true });

    expect(logSpy).toHaveBeenCalledWith(
      '[dry-run][step:step-2] handler({"foo":"bar"})'
    );

    logSpy.mockRestore();
  });
});

describe('Plan', () => {
  const ctx: ExecutionContext = { cwd: process.cwd() };

  it('executes contained executables sequentially', async () => {
    const order: string[] = [];

    const first = new Step(
      'first',
      new HandlerAction('first-action', async () => {
        order.push('first');
        return 'first-result';
      }),
      {}
    );

    const second = new Step(
      'second',
      new HandlerAction('second-action', async () => {
        order.push('second');
        return 'second-result';
      }),
      {}
    );

    const plan = new Plan('test-plan').add(first).add(second);

    const results = await plan.execute(ctx);

    expect(order).toEqual(['first', 'second']);
    expect(results).toEqual(['first-result', 'second-result']);
  });
});

describe('CommandLineAction', () => {
  it('builds commands from params for description and execution', async () => {
    const builder = vi.fn((params: { command: string }) => params.command);
    const action = new CommandLineAction<{ command: string }>('cmd', builder);

    const ctx: ExecutionContext = { cwd: process.cwd(), env: { TEST_ENV: '1' } };

    const describeResult = action.describe({ command: 'echo "hello"' });
    expect(describeResult).toBe('echo "hello"');

    // Mock child_process.exec
    const execMock = vi.fn((cmd: string, _options: any, cb: any) => {
      cb(null, 'hello\n', '');
    });

    vi.doMock('child_process', () => ({ exec: execMock }));

    const { stdout, stderr } = await action.run({ command: 'echo hello' }, ctx);

    expect(builder).toHaveBeenCalledWith({ command: 'echo hello' });
    expect(execMock).toHaveBeenCalled();
    expect(stdout.trim()).toBe('hello');
    expect(stderr).toBe('');
  });
});
