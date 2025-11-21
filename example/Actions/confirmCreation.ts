import { HandlerAction } from '../../src/index.js';
import { prompt, ProjectInfo } from '../utils.js';

/**
 * Action that displays a preview of the package.json and asks for user confirmation.
 * 
 * This action:
 * - Shows the user what will be written to package.json
 * - Prompts for confirmation (defaults to 'yes')
 * - Returns true if user confirms, false otherwise
 * 
 * This provides a safety check before making file system changes,
 * allowing users to review and abort if something looks incorrect.
 */
export function createConfirmCreationAction(id: string, projectInfo: ProjectInfo) {
  return new HandlerAction<ProjectInfo, boolean>(
    id,
    projectInfo,
    async (params) => {
    console.log('\nAbout to write to package.json:\n');
    console.log(JSON.stringify({
      name: params.name,
      version: params.version,
      description: params.description,
      main: params.entryPoint,
      author: params.author,
      license: params.license,
    }, null, 2));
    console.log();

    const answer = await prompt('Is this OK?', 'yes');
    return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
    }
  );
}
