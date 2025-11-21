import * as readline from 'readline';

/**
 * Utility function to prompt the user for input via the command line.
 * 
 * @param question - The question to ask the user
 * @param defaultValue - Optional default value to use if user presses Enter without input
 * @returns Promise that resolves to the user's input (or default value)
 * 
 * @example
 * ```typescript
 * const name = await prompt('What is your name?', 'John');
 * const age = await prompt('What is your age?');
 * ```
 */
export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue
      ? `${question} (${defaultValue}): `
      : `${question}: `;
    
    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Common interface for project information collected during wizard setup.
 * This is used as a parameter type across multiple actions.
 */
export interface ProjectInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  entryPoint: string;
  gitRepo: string;
}
