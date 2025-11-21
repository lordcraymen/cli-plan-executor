import * as path from 'path';
import { HandlerAction } from '../../src/index.js';
import { prompt, ProjectInfo } from '../utils.js';

/**
 * Action that interactively collects project information from the user.
 * 
 * This action prompts the user for various project details such as:
 * - Project name (defaults to current directory name)
 * - Version (defaults to 1.0.0)
 * - Description
 * - Entry point (defaults to index.js)
 * - Git repository URL
 * - Author
 * - License (defaults to ISC)
 * 
 * Returns a ProjectInfo object containing all collected information.
 */
export function createCollectProjectInfoAction(id: string) {
  return new HandlerAction<void, ProjectInfo>(
    id,
    undefined,
    async (_, ctx) => {
      console.log('This utility will walk you through creating a package.json file.');
      console.log('Press ^C at any time to quit.\n');

      const projectName = path.basename(ctx.cwd);
      
      const name = await prompt('package name', projectName);
      const version = await prompt('version', '1.0.0');
      const description = await prompt('description');
      const entryPoint = await prompt('entry point', 'index.js');
      const gitRepo = await prompt('git repository');
      const author = await prompt('author');
      const license = await prompt('license', 'ISC');

      return {
        name,
        version,
        description,
        author,
        license,
        entryPoint,
        gitRepo,
      };
    }
  );
}
