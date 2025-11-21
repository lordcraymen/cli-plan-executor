import { CommandLineAction } from '../../src/index.js';

/**
 * Action that initializes a new Git repository in the current directory.
 * 
 * This action executes the 'git init' command, which:
 * - Creates a new .git directory
 * - Initializes the repository structure
 * - Sets up the repository for version control
 * 
 * This is typically one of the first steps when setting up a new project
 * that will use Git for version control.
 */
export function createInitGitAction(id: string) {
  return new CommandLineAction(id, { command: 'git init' });
}
