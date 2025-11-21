import * as fs from 'fs/promises';
import * as path from 'path';
import { HandlerAction } from '../../src/index.js';

/**
 * Action that creates a .gitignore file with common Node.js exclusions.
 * 
 * This action generates a .gitignore file that excludes:
 * - node_modules/ - npm dependencies
 * - dist/ - build output
 * - *.log - log files
 * - .env - environment variables
 * - .DS_Store - macOS system files
 * 
 * This helps keep the Git repository clean and avoids committing
 * unnecessary or sensitive files.
 */
export function createGitignoreAction(id: string) {
  return new HandlerAction<void, void>(
    id,
    undefined,
    async (_, ctx) => {
    const gitignore = `node_modules/
dist/
*.log
.env
.DS_Store
`;

    const filePath = path.join(ctx.cwd, '.gitignore');
    await fs.writeFile(filePath, gitignore);
    console.log(`Created .gitignore at ${filePath}`);
    }
  );
}
