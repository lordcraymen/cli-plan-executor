import * as fs from 'fs/promises';
import * as path from 'path';
import { HandlerAction } from '../../src/index.js';
import { ProjectInfo } from '../utils.js';

/**
 * Action that creates a package.json file based on collected project information.
 * 
 * This action takes ProjectInfo as input and generates a standard npm package.json
 * file with the following sections:
 * - Basic metadata (name, version, description, author, license)
 * - Main entry point
 * - Default test script
 * - Git repository information (if provided)
 * 
 * The file is written to the current working directory.
 */
export function createPackageJsonAction(id: string, projectInfo: ProjectInfo) {
  return new HandlerAction<ProjectInfo, void>(
    id,
    projectInfo,
    async (params, ctx) => {
    const packageJson = {
      name: params.name,
      version: params.version,
      description: params.description,
      main: params.entryPoint,
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
      keywords: [],
      author: params.author,
      license: params.license,
      ...(params.gitRepo && {
        repository: {
          type: 'git',
          url: params.gitRepo,
        },
      }),
    };

    const filePath = path.join(ctx.cwd, 'package.json');
    await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Created package.json at ${filePath}`);
    }
  );
}
