import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Plan,
  HandlerAction,
  CommandLineAction,
  ExecutionContext,
} from '../src/index';

// Helper to prompt user for input
async function prompt(question: string, defaultValue?: string): Promise<string> {
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

// Action to collect project information
interface ProjectInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  entryPoint: string;
  gitRepo: string;
}

const collectProjectInfo = new HandlerAction<void, ProjectInfo>(
  'collect-project-info',
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

// Action to create package.json
const createPackageJson = new HandlerAction<ProjectInfo, void>(
  'create-package-json',
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

// Action to create README
const createReadme = new HandlerAction<ProjectInfo, void>(
  'create-readme',
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

// Action to create .gitignore
const createGitignore = new HandlerAction<void, void>(
  'create-gitignore',
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

// Action to initialize git
const initGit = new CommandLineAction('init-git', () => 'git init');

// Action to confirm creation
const confirmCreation = new HandlerAction<ProjectInfo, boolean>(
  'confirm-creation',
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

// Main wizard function
export async function runProjectWizard(projectPath: string): Promise<void> {
  const ctx: ExecutionContext = { cwd: projectPath };

  // Create wizard plan
  const wizardPlan = new Plan('project-wizard');

  // Step 1: Collect project info
  const collectStep = collectProjectInfo.createStepFromParams('collect-info', undefined);
  wizardPlan.add(collectStep);

  // Execute collection step first to get the info
  const [projectInfo] = await wizardPlan.execute(ctx) as [ProjectInfo];

  // Step 2: Confirm
  const confirmStep = confirmCreation.createStepFromParams('confirm', projectInfo);
  const confirmPlan = new Plan('confirm-plan');
  confirmPlan.add(confirmStep);
  const [confirmed] = await confirmPlan.execute(ctx) as [boolean];

  if (!confirmed) {
    console.log('Aborted.');
    return;
  }

  // Step 3: Create files
  const setupPlan = new Plan('setup-project');
  setupPlan.add(createPackageJson.createStepFromParams('create-pkg', projectInfo));
  setupPlan.add(createReadme.createStepFromParams('create-readme', projectInfo));
  setupPlan.add(createGitignore.createStepFromParams('create-gitignore', undefined));
  setupPlan.add(initGit.createStepFromParams('init-git', { command: 'git init' }));

  await setupPlan.execute(ctx);

  console.log('\n✓ Project initialized successfully!');
}

// Run if executed directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  runProjectWizard(projectPath).catch(console.error);
}
