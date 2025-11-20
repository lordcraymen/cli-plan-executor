Here’s a fresh `README.md` that builds on the Executable / Action / Step / Plan idea, but keeps execution and CLI/wizard concerns clearly separated and uses classes + inheritance instead of factories.

````md
# @lordcraymen/cli-plan-executor

A small, opinionated core for modeling and executing plans made of steps and actions.

It gives you:

- A minimal **domain model** for workflows:
  - `Action<Params, Result>` — "what" can be done
  - `Step<Params, Result>` — a concrete use of an action with parameters
  - `Plan` — a composition of steps and nested plans
- A simple `Executable` interface you can target from a CLI, wizard, or UI.
- Concrete action types:
  - `HandlerAction` — runs a TypeScript/JavaScript function
  - `CommandLineAction` — runs a shell command

The library **does not** depend on any prompt or argument-parsing library.  
CLI/wizard logic lives outside and can use introspection hooks (metadata) from actions if needed.

---

## Installation

```bash
npm install @lordcraymen/cli-plan-executor
# or
yarn add @lordcraymen/cli-plan-executor
# or
pnpm add @lordcraymen/cli-plan-executor
````

---

## Core concepts

### ExecutionContext

Shared context for all executions (Steps and Plans):

```ts
export interface ExecutionContext {
  cwd: string;
  dryRun?: boolean;
  env?: Record<string, string>;
  // extend with logger, progress, UI hooks, etc.
}
```

### Executable

Common abstraction for anything that can be executed (Step, Plan, or custom):

```ts
export abstract class Executable<Result = unknown> {
  constructor(public readonly id: string) {}
  abstract execute(ctx: ExecutionContext): Promise<Result>;
}
```

### Action

An `Action` expresses *what* can be done, independent of when/how it is used.

* Typed input parameters (`Params`)
* Typed result (`Result`)
* Optional metadata describing its parameters (for a wizard or UI)
* No direct knowledge of CLI, prompts, or flags

```ts
export interface ParamMeta<Params = any> {
  // optional input metadata used by higher layers (wizard/CLI)
  // keys are parameter names
  [K: string]: {
    description?: string;
    required?: boolean;
    defaultValue?: any;
  };
}

export abstract class Action<Params = any, Result = unknown> {
  constructor(
    public readonly id: string,
    public readonly paramsMeta?: ParamMeta<Params>
  ) {}

  /**
   * Optional human-readable description, given bound params.
   * Used for dry-run output, logging, previews etc.
   */
  describe(params: Params): string {
    return `${this.id}(${JSON.stringify(params)})`;
  }

  /**
   * Actual effect of this action.
   */
  abstract run(params: Params, ctx: ExecutionContext): Promise<Result>;
}
```

### Step

A `Step` is a concrete use of one action with concrete parameters.

* Exactly **one** action
* A `params` object representing the total of all decisions taken for this step
* Implements `Executable`

```ts
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
      // In dry-run, just describe what would happen
      const description = this.action.describe(this.params);
      console.log(`[dry-run][step:${this.id}] ${description}`);
      return undefined as unknown as Result;
    }

    return this.action.run(this.params, ctx);
  }
}
```

The idea: any “decisions” (flags, prompts, defaults, auto-detection) happen **before** the step is created.
A step represents a *fully decided* unit.

### Plan

A `Plan` is a composition of `Executable`s:

* Contains `Step`s and/or nested `Plan`s
* Implements `Executable<void>`

```ts
export type PlanItem = Executable<any>;

export class Plan extends Executable<void> {
  constructor(
    id: string,
    public readonly items: PlanItem[] = []
  ) {
    super(id);
  }

  add(item: PlanItem): this {
    this.items.push(item);
    return this;
  }

  async execute(ctx: ExecutionContext): Promise<void> {
    for (const item of this.items) {
      await item.execute(ctx);
    }
  }
}
```

Plans can be nested arbitrarily:

```ts
const subPlan = new Plan('sub-plan', [
  /* some steps */
]);

const mainPlan = new Plan('main-plan', [
  /* some steps */,
  subPlan,
]);
```

---

## Concrete action types

### HandlerAction — run a JS/TS function

A convenient base for code-level actions:

```ts
export abstract class HandlerAction<Params, Result> extends Action<Params, Result> {
  abstract handle(params: Params, ctx: ExecutionContext): Promise<Result> | Result;

  async run(params: Params, ctx: ExecutionContext): Promise<Result> {
    return await this.handle(params, ctx);
  }
}
```

Example:

```ts
// src/actions/DeleteByPatternAction.ts
import {
  ExecutionContext,
  HandlerAction,
} from '@your-org/cli-executor';

export interface DeleteParams {
  pattern: string;
}

export class DeleteByPatternAction extends HandlerAction<DeleteParams, void> {
  constructor() {
    super('delete-by-pattern', {
      pattern: {
        description: 'Glob pattern of files to delete',
        required: true,
        defaultValue: '*.*',
      },
    });
  }

  override describe(params: DeleteParams): string {
    return `Delete files matching "${params.pattern}"`;
  }

  async handle(params: DeleteParams, ctx: ExecutionContext): Promise<void> {
    const { pattern } = params;
    // Implementation detail: e.g. use fast-glob + fs.rm
    console.log(`[delete-by-pattern] Deleting ${pattern} in ${ctx.cwd}`);
  }
}
```

Usage as a step:

```ts
const deleteAction = new DeleteByPatternAction();

const deleteStep = new Step<DeleteParams, void>(
  'delete-step-1',
  deleteAction,
  { pattern: '*.*' }
);
```

### CommandLineAction — run a shell command

An action type dedicated to running external commands.

```ts
import { spawn } from 'node:child_process';

export interface CommandLineParams {
  argv: string[]; // e.g. ['rm', '-rf', 'dist']
}

export abstract class CommandLineAction<Result = void>
  extends Action<CommandLineParams, Result> {

  constructor(id: string) {
    super(id, {
      argv: { description: 'Command and arguments', required: true },
    });
  }

  override describe(params: CommandLineParams): string {
    return params.argv.join(' ');
  }

  async run(params: CommandLineParams, ctx: ExecutionContext): Promise<Result> {
    const [cmd, ...args] = params.argv;

    if (ctx.dryRun) {
      console.log(`[dry-run][cmd] ${cmd} ${args.join(' ')}`);
      return undefined as unknown as Result;
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd: ctx.cwd,
        env: { ...process.env, ...(ctx.env ?? {}) },
        stdio: 'inherit',
      });

      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command "${cmd}" exited with code ${code}`));
      });
    });

    return undefined as unknown as Result;
  }
}
```

Example concrete CL action:

```ts
export interface DeleteCLIParams {
  pattern: string;
}

export class DeleteCLIAction extends CommandLineAction<void> {
  constructor() {
    super('delete-cli');
  }

  buildArgs(params: DeleteCLIParams): string[] {
    // Windows vs Unix could be handled via env flags etc.
    return ['rm', '-rf', params.pattern];
  }

  createStepFromParams(stepId: string, params: DeleteCLIParams): Step<CommandLineParams, void> {
    const argv = this.buildArgs(params);
    return new Step(
      stepId,
      this,
      { argv }
    );
  }
}
```

The `createStepFromParams` helper is optional; it shows how one can layer param types:

* `DeleteCLIParams` — higher-level semantic parameters
* `CommandLineParams` — low-level `argv` for execution

---

## Putting it together: build and run a plan

```ts
import {
  ExecutionContext,
  Plan,
  Step,
} from '@lordcraymen/cli-plan-executor';
import { DeleteByPatternAction } from './actions/DeleteByPatternAction';
import { DeleteCLIAction } from './actions/DeleteCLIAction';

const deleteHandlerAction = new DeleteByPatternAction();
const deleteCLIAction = new DeleteCLIAction();

const cleanupPlan = new Plan('cleanup')
  .add(
    new Step('delete-tmp', deleteHandlerAction, { pattern: 'tmp/**/*' })
  )
  .add(
    deleteCLIAction.createStepFromParams('delete-dist', { pattern: 'dist' })
  );

const ctx: ExecutionContext = {
  cwd: process.cwd(),
  dryRun: true, // see what would happen first
};

cleanupPlan.execute(ctx);
```

Output (dry-run mode):

```text
[dry-run][step:delete-tmp] Delete files matching "tmp/**/*"
[dry-run][step:delete-dist] rm -rf dist
```

---

## How this works with a CLI wizard

This package is intentionally **not** responsible for:

* Prompting the user
* Parsing command-line arguments
* Deciding where parameter values come from

Instead, it exposes enough structure to make that easy:

* `Action.paramsMeta` can be inspected by a wizard/CLI layer to discover:

  * which parameters exist
  * which are required
  * defaults and descriptions
* `Step.params` is the concrete result of all decisions taken for that step.
* `Plan` can be constructed after all decisions are made, previewed, then executed.

One typical layering:

1. **Domain**
   Define `Action` subclasses (`InitProjectAction`, `ScaffoldFilesAction`, `RunTestsAction`).

2. **Wizard / CLI**

   * Reads metadata from each `Action.paramsMeta`.
   * Resolves parameter values from flags, environment, defaults, interactive prompts.
   * Creates `Step` instances with the final params.
   * Composes them into a `Plan`.

3. **Execution**

   * Passes the `Plan` and an `ExecutionContext` into `plan.execute(ctx)`.
   * Optionally supports `dryRun` and logging.

This keeps:

* Domain logic (what actions do) independent from
* Decision logic (how params are derived) and
* Infrastructure (how things are executed in process / via shell).

---

## Testing

The model is designed to be straightforward to test.

* **Actions**

  * Test concrete `Action` subclasses directly with fake `ExecutionContext`.
  * Example: `DeleteByPatternAction.handle(params, ctx)` with a fake filesystem.

* **Steps**

  * Test that they call the action with the expected params.
  * Optional: use `dryRun` to assert against `describe` output.

* **Plans**

  * Test the sequence of execution:

    * Replace real actions with test doubles.
    * Assert ordering and parameters.

* **CLI / wizard layer** (outside this package)

  * Test mapping from flags/prompts to `Step.params`.
  * Test plan construction logic separately from execution.

---

## Design goals

* Clear separation between:

  * *what* can be done (`Action`)
  * *how* it is grouped (`Plan`)
  * *when/with what data* it is executed (`Step`)
* Explicit, composable `Executable` interface
* No hard dependency on any CLI/prompt technology
* Class-based design with inheritance for action types
* Easy to introspect for building type-safe wizards and CLIs on top
