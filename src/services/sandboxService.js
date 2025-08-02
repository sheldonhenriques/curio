import { Daytona } from "@daytonaio/sdk";
import fs from 'fs';
import path from 'path';

const getDaytonaClient = () => {
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY environment variable is required");
  }
  
  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });
};

// New function that returns sandbox ID immediately and setup promise separately
export const createSandboxWithId = async (projectName, statusCallback) => {
  const daytona = getDaytonaClient();
  
  try {
    // Create the sandbox - this is fast and returns immediately
    const sandbox = await daytona.create({
      public: true,
      image: "node:20",
      name: `curio-${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      envVars: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
    });

    const sandboxId = sandbox.id;

    // Create a promise for the remaining setup work
    const setupPromise = performSandboxSetup(sandbox, statusCallback);

    return {
      sandboxId,
      setupPromise
    };
  } catch (error) {
    console.error('❌ Error creating sandbox:', error);
    throw error;
  }
};

// Separate function for the time-consuming setup work
const performSandboxSetup = async (sandbox, statusCallback) => {
  try {
    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/project`;
    
    if (statusCallback) {
      await statusCallback('setting_up_nextjs');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    const createNextApp = await sandbox.process.executeCommand(
      `npx create-next-app@latest project --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes`,
      rootDir,
      undefined,
      1200
    );

    if (createNextApp.exitCode !== 0) {
      throw new Error(`Failed to create Next.js app: ${createNextApp.result}`);
    }

    if (statusCallback) {
      await statusCallback('installing_claude_sdk');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    // Install Claude Code SDK for AI chat functionality
    const installClaudeCode = await sandbox.process.executeCommand(
      `npm install -g @anthropic-ai/claude-code@latest`,
      projectDir,
      undefined,
      240
    );

    if (installClaudeCode.exitCode !== 0) {
      console.warn(`⚠️  Claude Code SDK installation failed for ${sandbox.id}: ${installClaudeCode.result}`);
    }

    // Continue with the rest of the setup...
    return await continueSetup(sandbox, projectDir, statusCallback);
  } catch (error) {
    console.error(`❌ Setup failed for sandbox ${sandbox.id}:`, error);
    throw error;
  }
};

// Function to continue with the remaining setup after Next.js app creation
const continueSetup = async (sandbox, projectDir, statusCallback) => {
  try {
    if (statusCallback) {
      await statusCallback('configuring_editor');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    // Add Visual Editor SDK to the Next.js project
    await addVisualEditorSDK(sandbox, projectDir);
    
    if (statusCallback) {
      await statusCallback('installing_dependencies');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    // Install AST dependencies for ID injection and chokidar for file watching
    const installDeps = await sandbox.process.executeCommand(
      `npm install @babel/parser @babel/traverse @babel/types @babel/generator chokidar`,
      projectDir,
      undefined,
      120
    );

    if (installDeps.exitCode !== 0) {
      console.warn(`⚠️  Failed to install dependencies for ${sandbox.id}: ${installDeps.result}`);
    }
    
    if (statusCallback) {
      await statusCallback('optimizing_project');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    // Inject AST IDs into JSX/TSX files
    await injectASTIds(sandbox, projectDir);
    
    if (statusCallback) {
      await statusCallback('configuring_editor');
      await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay since we're reusing status
    }
    
    // Set up file watcher files but don't start it yet - will be started after project creation
    await setupFileWatcherFiles(sandbox, projectDir);
    
    if (statusCallback) {
      await statusCallback('starting_server');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    // Start the development server
    await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000" },
      60
    );

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 10000));
    
    if (statusCallback) {
      await statusCallback('finalizing');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    const preview = await sandbox.getPreviewLink(3000);

    return {
      sandboxId: sandbox.id,
      previewUrl: preview.url,
      projectDir: projectDir,
      status: 'ready'
    };
  } catch (error) {
    console.error(`❌ Setup failed for sandbox ${sandbox.id}:`, error);
    throw error;
  }
};


export const startSandbox = async (sandboxId) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find(s => s.id === sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    await sandbox.refreshData();
    const sandboxState = sandbox.state;
    
    if (sandboxState === 'stopped') {
      await sandbox.start(60);
    }

    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/project`;

    // Check and update Visual Editor SDK if needed
    await addVisualEditorSDK(sandbox, projectDir);

    const checkServer = await sandbox.process.executeCommand(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'",
      projectDir
    );

    if (checkServer.result?.trim() !== '200') {
      await sandbox.process.executeCommand(
        `nohup npm run dev > dev-server.log 2>&1 &`,
        projectDir,
        { PORT: "3000" }
      );
      
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }

    const preview = await sandbox.getPreviewLink(3000);

    return {
      previewUrl: preview.url,
      status: 'started'
    };

  } catch (error) {
    console.error("Error starting sandbox:", error);
    throw error;
  }
};

export const stopSandbox = async (sandboxId) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find(s => s.id === sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    await sandbox.stop(60);
    
    return {
      status: 'stopped'
    };

  } catch (error) {
    console.error("Error stopping sandbox:", error);
    throw error;
  }
};

export const getSandboxStatus = async (sandboxId) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandboxes = await daytona.list();
    
    const sandbox = sandboxes.find(s => s.id === sandboxId);
    
    if (!sandbox) {
      return { status: 'not_found' };
    }
    
    await sandbox.refreshData();
    const sandboxState = sandbox.state;
    
    let previewUrl = null;
    if (sandboxState === 'started') {
      try {
        const preview = await sandbox.getPreviewLink(3000);
        previewUrl = preview.url;
      } catch (error) {
        console.warn('Could not get preview URL:', error.message);
      }
    }
    
    return {
      status: sandboxState,
      previewUrl: previewUrl
    };

  } catch (error) {
    console.error("Error getting sandbox status:", error);
    return { status: 'error' };
  }
};

export const deleteSandbox = async (sandboxId) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find(s => s.id === sandboxId);
    
    if (!sandbox) {
      return { status: 'deleted', message: 'Sandbox not found (already deleted or never existed)' };
    }
    
    await sandbox.delete();
    
    return { status: 'deleted', message: 'Sandbox successfully deleted' };

  } catch (error) {
    console.error("Error deleting sandbox:", error);
    throw error;
  }
};

/**
 * Add Visual Editor SDK to Next.js project with version checking
 */
async function addVisualEditorSDK(sandbox, projectDir) {
  try {
    // Get the current Visual Editor SDK content and version
    const currentSDKContent = getVisualEditorSDKContent();
    const currentVersion = extractVersionFromSDK(currentSDKContent);

    // Check if SDK already exists in sandbox
    const sdkPath = `${projectDir}/public/curio-visual-editor.js`;
    const checkSDKResult = await sandbox.process.executeCommand(
      `test -f "${sdkPath}" && echo "exists" || echo "not_found"`,
      projectDir
    );

    let shouldUpdate = true;

    if (checkSDKResult.result?.trim() === 'exists') {
      // Read existing SDK content to check version
      const readSDKResult = await sandbox.process.executeCommand(
        `cat "${sdkPath}"`,
        projectDir
      );

      if (readSDKResult.exitCode === 0) {
        const existingSdkContent = readSDKResult.result;
        const existingVersion = extractVersionFromSDK(existingSdkContent);


        // Compare versions (simple string comparison for now)
        if (existingVersion === currentVersion) {
          shouldUpdate = false;
        }
      }
    }

    if (shouldUpdate) {
      // Create or update the SDK file in the public directory of the Next.js project
      const createSDKCommand = `cat > "${sdkPath}" << 'CURIO_EOF'
${currentSDKContent}
CURIO_EOF`;

      const createSDKResult = await sandbox.process.executeCommand(
        createSDKCommand,
        projectDir
      );

      if (createSDKResult.exitCode !== 0) {
        console.warn(`Warning: Failed to create/update Visual Editor SDK file: ${createSDKResult.result}`);
        return;
      }

    }

    // Modify the layout.tsx file to include the Visual Editor SDK
    const layoutPath = `${projectDir}/src/app/layout.tsx`;
    
    // Read current layout content
    const readLayoutResult = await sandbox.process.executeCommand(
      `cat "${layoutPath}"`,
      projectDir
    );

    if (readLayoutResult.exitCode !== 0) {
      console.warn(`Warning: Failed to read layout.tsx: ${readLayoutResult.result}`);
      return;
    }

    let layoutContent = readLayoutResult.result;

    // Add the script tag to include the Visual Editor SDK
    if (!layoutContent.includes('curio-visual-editor.js')) {
      // Insert the script tag before the closing </body> tag
      const scriptTag = `        <script src="/curio-visual-editor.js" defer></script>
      </body>`;
      
      layoutContent = layoutContent.replace('</body>', scriptTag);

      // Write the updated layout back
      const writeLayoutCommand = `cat > "${layoutPath}" << 'CURIO_EOF'
${layoutContent}
CURIO_EOF`;

      const writeLayoutResult = await sandbox.process.executeCommand(
        writeLayoutCommand,
        projectDir
      );

      if (writeLayoutResult.exitCode !== 0) {
        console.warn(`Warning: Failed to update layout.tsx: ${writeLayoutResult.result}`);
      }
    }

  } catch (error) {
    console.warn('Warning: Failed to add Visual Editor SDK:', error.message);
    // Don't throw error - continue with sandbox creation even if Visual Editor SDK addition fails
  }
}

/**
 * Get the Visual Editor SDK content as a string
 * This reads the SDK from the standalone file to ensure it's always up-to-date
 */
function getVisualEditorSDKContent() {
  // Read the standalone SDK file
  const sdkPath = path.resolve(process.cwd(), 'src/services/visual-editor-sdk.js');
  return fs.readFileSync(sdkPath, 'utf8');
}

/**
 * Extract version number from Visual Editor SDK content
 */
function extractVersionFromSDK(sdkContent) {
  // Look for the version constant in the SDK content
  const versionMatch = sdkContent.match(/const CURIO_VISUAL_EDITOR_VERSION = ['"`]([^'"`]+)['"`]/);
  return versionMatch ? versionMatch[1] : 'unknown';
}

/**
 * Inject AST-based unique IDs into JSX/TSX files
 */
async function injectASTIds(sandbox, projectDir) {
  try {
    
    // Step 1: Read the AST injector script from our local file
    const astInjectorPath = path.resolve(process.cwd(), 'src/services/astIdInjector.js');
    const astInjectorContent = fs.readFileSync(astInjectorPath, 'utf8');
    
    const sandboxScriptPath = `${projectDir}/astIdInjector.js`;
    
    // Step 2: Write the script to the sandbox using heredoc (no escaping issues)
    const writeScriptCommand = `cat > "${sandboxScriptPath}" << 'CURIO_EOF'
${astInjectorContent}
CURIO_EOF`;

    const writeResult = await sandbox.process.executeCommand(writeScriptCommand, projectDir);
    
    if (writeResult.exitCode !== 0) {
      throw new Error(`Failed to write AST injector script: ${writeResult.result}`);
    }
    
    
    // Step 3: Execute the script in the sandbox
    const executeResult = await sandbox.process.executeCommand(
      `node astIdInjector.js "${projectDir}"`,
      projectDir,
      undefined,
      180
    );
    
    // Step 4: Clean up the script file
    await sandbox.process.executeCommand(`rm -f "${sandboxScriptPath}"`, projectDir);
    
    if (executeResult.exitCode !== 0) {
      console.warn('AST ID injection failed:', executeResult.result);
    }

  } catch (error) {
    console.warn('Warning: Failed to inject AST IDs:', error.message);
    // Don't throw error - continue with sandbox creation even if AST injection fails
  }
}

/**
 * Set up file watcher files in the sandbox (without starting the watcher)
 */
async function setupFileWatcherFiles(sandbox, projectDir) {
  try {
    const rootDir = await sandbox.getUserRootDir();
    const curioDir = `${rootDir}/.curio`;
    
    // Step 1: Create .curio directory
    const createDirResult = await sandbox.process.executeCommand(
      `mkdir -p "${curioDir}"`,
      rootDir
    );
    
    if (createDirResult.exitCode !== 0) {
      throw new Error(`Failed to create .curio directory: ${createDirResult.result}`);
    }

    // Step 2: Read the file watcher script from our local file
    const fileWatcherPath = path.resolve(process.cwd(), 'src/services/fileWatcher.js');
    const fileWatcherContent = fs.readFileSync(fileWatcherPath, 'utf8');
    
    const sandboxWatcherPath = `${curioDir}/fileWatcher.js`;
    
    // Step 3: Write the file watcher script to the .curio directory
    const writeWatcherCommand = `cat > "${sandboxWatcherPath}" << 'CURIO_EOF'
${fileWatcherContent}
CURIO_EOF`;

    const writeResult = await sandbox.process.executeCommand(writeWatcherCommand, rootDir);
    
    if (writeResult.exitCode !== 0) {
      throw new Error(`Failed to write file watcher script: ${writeResult.result}`);
    }

    // Step 4: Create package.json and install chokidar in the .curio directory
    const packageJsonContent = `{
  "name": "curio-file-watcher",
  "version": "1.0.0",
  "private": true,
  "description": "Curio file watcher service",
  "main": "fileWatcher.js",
  "dependencies": {
    "chokidar": "^3.5.3"
  }
}`;

    const writePackageJsonCommand = `cat > "${curioDir}/package.json" << 'CURIO_EOF'
${packageJsonContent}
CURIO_EOF`;

    const writePackageResult = await sandbox.process.executeCommand(writePackageJsonCommand, rootDir);
    
    if (writePackageResult.exitCode !== 0) {
      throw new Error(`Failed to write package.json: ${writePackageResult.result}`);
    }

    // Install chokidar
    const installChokidarResult = await sandbox.process.executeCommand(
      `cd "${curioDir}" && npm install`,
      rootDir,
      undefined,
      120
    );

    if (installChokidarResult.exitCode !== 0) {
      console.warn('Warning: Failed to install chokidar in .curio directory:', installChokidarResult.result);
      // Continue anyway - maybe it's already available globally or from project dependencies
    }

    console.log('✅ File watcher files prepared (will be started after project creation)');

  } catch (error) {
    console.warn('Warning: Failed to set up file watcher:', error.message);
    // Don't throw error - continue with sandbox creation even if file watcher setup fails
  }
}

/**
 * Start file watcher with project ID after project creation
 */
export const startFileWatcher = async (sandboxId, projectId) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find(s => s.id === sandboxId);
    
    if (!sandbox) {
      console.warn(`Sandbox ${sandboxId} not found for file watcher update`);
      return;
    }

    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/project`;
    const curioDir = `${rootDir}/.curio`;

    // Kill any existing file watcher processes (in case of restart)
    const killResult = await sandbox.process.executeCommand(
      `pkill -f "node fileWatcher.js" || true`,
      rootDir
    );
    console.log('File watcher kill result:', killResult);

    // Wait a moment for processes to clean up
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if .curio directory exists
    const checkDirResult = await sandbox.process.executeCommand(
      `test -d "${curioDir}" && echo "exists" || echo "missing"`,
      rootDir
    );
    
    if (checkDirResult.result?.trim() === 'missing') {
      console.log('⏳ .curio directory not ready yet, file watcher will be started by initial setup');
      return;
    }

    console.log('✅ Curio directory exists, updating file watcher with project ID:', projectId);

    // Verify file watcher script exists
    const checkFileResult = await sandbox.process.executeCommand(
      `test -f "${curioDir}/fileWatcher.js" && echo "exists" || echo "missing"`,
      rootDir
    );
    
    if (checkFileResult.result?.trim() === 'missing') {
      console.warn('⚠️ File watcher script missing, skipping restart');
      return;
    }

    console.log('File watcher file check: exists');

    // Restart file watcher with correct project ID
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/file-changes`
      : 'http://localhost:3000/api/webhook/file-changes';

    const startWatcherCommand = `cd "${curioDir}" && nohup node fileWatcher.js > file-watcher.log 2>&1 &`;
    
    const startResult = await sandbox.process.executeCommand(
      startWatcherCommand,
      rootDir,
      {
        CURIO_WEBHOOK_URL: webhookUrl,
        CURIO_PROJECT_ID: projectId.toString(),
        CURIO_SANDBOX_ID: sandboxId,
        CURIO_PROJECT_DIR: projectDir
      },
      60 // Increased timeout
    );

    console.log('File watcher start result:', startResult);

    if (startResult.exitCode === 0) {
      console.log(`✅ File watcher started with project ID: ${projectId}`);
      
      // Verify it's running after a short delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      const verifyResult = await sandbox.process.executeCommand(
        `pgrep -f "node fileWatcher.js" || echo "not running"`,
        rootDir
      );
      console.log('File watcher verification:', verifyResult);
      
      if (verifyResult.result?.trim() === 'not running') {
        // Check the log file for more details
        const logResult = await sandbox.process.executeCommand(
          `tail -20 "${curioDir}/file-watcher.log" 2>/dev/null || echo "no log file"`,
          rootDir
        );
        console.log('File watcher log:', logResult);
      }
    } else {
      console.warn('❌ File watcher restart failed:', startResult.result);
    }

  } catch (error) {
    console.warn('Warning: Failed to update file watcher:', error.message);
  }
};

/**
 * Trigger initial scan of existing routes in the file watcher
 */
export const triggerFileWatcherScan = async (sandboxId) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find(s => s.id === sandboxId);
    
    if (!sandbox) {
      console.warn(`Sandbox ${sandboxId} not found for scan trigger`);
      return;
    }

    const rootDir = await sandbox.getUserRootDir();
    
    // Send SIGUSR1 signal to the file watcher process to trigger scan
    const triggerScanResult = await sandbox.process.executeCommand(
      `pkill -SIGUSR1 -f "node fileWatcher.js" && echo "scan triggered" || echo "no process found"`,
      rootDir
    );
    
    console.log('File watcher scan trigger result:', triggerScanResult);
    
    if (triggerScanResult.result?.trim() === 'scan triggered') {
      console.log('✅ File watcher scan triggered successfully');
    } else {
      console.warn('⚠️ File watcher process not found or scan trigger failed');
    }
    
  } catch (error) {
    console.error('❌ Error triggering file watcher scan:', error);
  }
};