import { Daytona } from "@daytonaio/sdk";

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
    
    await sandbox.refreshData();
    const sandboxState = sandbox.state;
    
    if (sandboxState === 'started') {
      await sandbox.stop();
    }

    return { status: 'stopped' };

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
    
    if (sandboxState === 'started') {
      try {
        const preview = await sandbox.getPreviewLink(3000);
        return {
          status: 'started',
          previewUrl: preview.url
        };
      } catch (error) {
        return { status: 'started' };
      }
    }

    return { status: sandboxState };

  } catch (error) {
    console.error("Error checking sandbox status:", error);
    return { status: 'error' };
  }
};

export const setupInactivityTimeout = (sandboxId, timeoutMinutes = 10) => {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  return setTimeout(async () => {
    try {
      await stopSandbox(sandboxId);
    } catch (error) {
      console.error("Error stopping sandbox due to inactivity:", error);
    }
  }, timeoutMs);
};

export const SANDBOX_CREATION_STEPS = [
  { id: 'creating', label: 'Creating Daytona sandbox...' },
  { id: 'setup', label: 'Setting up Next.js project...' },
  { id: 'installing', label: 'Installing dependencies...' },
  { id: 'claude-code', label: 'Installing Claude Code SDK...' },
  { id: 'starting', label: 'Starting development server...' },
  { id: 'complete', label: 'Sandbox ready!' }
];

export const SANDBOX_STARTUP_STEPS = [
  { id: 'starting', label: 'Starting sandbox...' },
  { id: 'server', label: 'Starting development server...' },
  { id: 'complete', label: 'Sandbox ready!' }
];