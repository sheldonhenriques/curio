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

export const createSandbox = async (projectName) => {
  const daytona = getDaytonaClient();
  
  try {
    const sandbox = await daytona.create({
      public: true,
      image: "node:20",
      name: `curio-${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      envVars: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
    });

    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/project`;
    
    const createNextApp = await sandbox.process.executeCommand(
      `npx create-next-app@latest project --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes`,
      rootDir,
      undefined,
      1200
    );

    if (createNextApp.exitCode !== 0) {
      throw new Error(`Failed to create Next.js app: ${createNextApp.result}`);
    }

    // Install Claude Code SDK for AI chat functionality
    const installClaudeCode = await sandbox.process.executeCommand(
      `npm install -g @anthropic-ai/claude-code@latest`,
      projectDir,
      undefined,
      240
    );

    if (installClaudeCode.exitCode !== 0) {
      console.warn(`Warning: Failed to install Claude Code SDK: ${installClaudeCode.result}`);
      // Don't throw error - continue with sandbox creation even if Claude Code installation fails
    }

    // Add Visual Editor SDK to the Next.js project
    await addVisualEditorSDK(sandbox, projectDir);
    
    // Install AST dependencies for ID injection
    const installASTDeps = await sandbox.process.executeCommand(
      `npm install @babel/parser @babel/traverse @babel/types @babel/generator`,
      projectDir,
      undefined,
      120
    );

    if (installASTDeps.exitCode !== 0) {
      console.warn(`Warning: Failed to install AST dependencies: ${installASTDeps.result}`);
    }
    
    // Inject AST IDs into JSX/TSX files
    await injectASTIds(sandbox, projectDir);
    
    await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000" },
      60
    );

    await new Promise((resolve) => setTimeout(resolve, 10000));
    
    const preview = await sandbox.getPreviewLink(3000);

    return {
      sandboxId: sandbox.id,
      previewUrl: preview.url,
      projectDir: projectDir,
      status: 'created'
    };

  } catch (error) {
    console.error("Error creating sandbox:", error);
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
    const astInjectorPath = path.resolve(process.cwd(), 'src/services/ast-injector.js');
    const astInjectorContent = fs.readFileSync(astInjectorPath, 'utf8');
    
    const sandboxScriptPath = `${projectDir}/ast-injector.js`;
    
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
      `node ast-injector.js "${projectDir}"`,
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