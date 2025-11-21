/**
 * Project Wizard - Interactive CLI for Project Initialization
 * 
 * This module demonstrates the cli-plan-executor framework by implementing
 * an interactive project setup wizard similar to 'npm init'. It showcases:
 * 
 * - Sequential execution of interactive actions
 * - User input collection and validation
 * - Conditional execution based on user confirmation
 * - File generation from templates
 * - Command-line tool integration
 * 
 * The wizard guides users through creating a new project with:
 * - package.json configuration
 * - README.md documentation
 * - .gitignore for version control
 * - Git repository initialization
 */

import { Plan, ExecutionContext } from '../src/index.js';
import { ProjectInfo } from './utils.js';
import { createCollectProjectInfoAction } from './Actions/collectProjectInfo.js';
import { createConfirmCreationAction } from './Actions/confirmCreation.js';
import { createPackageJsonAction } from './Actions/createPackageJson.js';
import { createReadmeAction } from './Actions/createReadme.js';
import { createGitignoreAction } from './Actions/createGitignore.js';
import { createInitGitAction } from './Actions/initGit.js';

/**
 * Main wizard function that orchestrates the project initialization process.
 * 
 * The wizard executes in three phases:
 * 1. Information Collection - Gather project details from user
 * 2. Confirmation - Show preview and get user approval
 * 3. Project Setup - Create files and initialize git repository
 * 
 * @param projectPath - The directory where the project should be initialized
 */
export async function runProjectWizard(projectPath: string): Promise<void> {
  const ctx: ExecutionContext = { cwd: projectPath };

  // Phase 1: Collect project information from user
  const wizardPlan = new Plan('project-wizard');
  wizardPlan.add(createCollectProjectInfoAction('collect-info'));
  const [projectInfo] = await wizardPlan.execute(ctx) as [ProjectInfo];

  // Phase 2: Show preview and get user confirmation
  const confirmPlan = new Plan('confirm-plan');
  confirmPlan.add(createConfirmCreationAction('confirm', projectInfo));
  const [confirmed] = await confirmPlan.execute(ctx) as [boolean];

  if (!confirmed) {
    console.log('Aborted.');
    return;
  }

  // Phase 3: Create project files and initialize repository
  const setupPlan = new Plan('setup-project');
  setupPlan.add(createPackageJsonAction('create-pkg', projectInfo));
  setupPlan.add(createReadmeAction('create-readme', projectInfo));
  setupPlan.add(createGitignoreAction('create-gitignore'));
  setupPlan.add(createInitGitAction('init-git'));

  await setupPlan.execute(ctx);

  console.log('\n✓ Project initialized successfully!');
}

// Run if executed directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  runProjectWizard(projectPath).catch(console.error);
}
