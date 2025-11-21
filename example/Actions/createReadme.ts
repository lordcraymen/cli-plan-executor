import * as fs from 'fs/promises';
import * as path from 'path';
import { HandlerAction } from '../../src/index.js';
import { ProjectInfo } from '../utils.js';

/**
 * Action that creates a README.md file for the project.
 * 
 * Generates a basic README with:
 * - Project name as header
 * - Description
 * - Installation instructions
 * - Usage example (referencing the entry point)
 * - License information
 * 
 * The README follows standard Markdown formatting conventions.
 */
export function createReadmeAction(id: string, projectInfo: ProjectInfo) {
  return new HandlerAction<ProjectInfo, void>(
    id,
    projectInfo,
    async (params, ctx) => {
    const readme = `# ${params.name}

${params.description || 'A new project'}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
node ${params.entryPoint}
\`\`\`

## License

${params.license}
`;

    const filePath = path.join(ctx.cwd, 'README.md');
    await fs.writeFile(filePath, readme);
    console.log(`Created README.md at ${filePath}`);
    }
  );
}
