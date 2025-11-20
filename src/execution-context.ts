export interface ExecutionContext {
  cwd: string;
  dryRun?: boolean;
  env?: Record<string, string>;
}

export type EnvVariables = Record<string, string>;
