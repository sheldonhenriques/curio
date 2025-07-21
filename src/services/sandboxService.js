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

/**
 * Add Visual Editor SDK to Next.js project
 */
async function addVisualEditorSDK(sandbox, projectDir) {
  try {
    // Get the Visual Editor SDK content
    const sdkContent = getVisualEditorSDKContent();

    // Create the SDK file in the public directory of the Next.js project
    const createSDKCommand = `cat > "${projectDir}/public/curio-visual-editor.js" << 'CURIO_EOF'
${sdkContent}
CURIO_EOF`;

    const createSDKResult = await sandbox.process.executeCommand(
      createSDKCommand,
      projectDir
    );

    if (createSDKResult.exitCode !== 0) {
      console.warn(`Warning: Failed to create Visual Editor SDK file: ${createSDKResult.result}`);
      return;
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
      } else {
        console.log('Visual Editor SDK added to Next.js project successfully');
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
  try {
    // Read the standalone SDK file
    const sdkPath = path.resolve(process.cwd(), 'src/services/visual-editor-sdk.js');
    return fs.readFileSync(sdkPath, 'utf8');
  } catch (error) {
    console.warn('Failed to read Visual Editor SDK file, using fallback:', error.message);
    // Fallback to basic version
    return `/**
 * Visual Editor SDK for Curio Webserver Nodes - Fallback Version
 * This is a minimal fallback when the main SDK file cannot be read
 */
console.warn('Using fallback Visual Editor SDK - full features may not be available');

class CurioVisualEditor {
  constructor() {
    this.isSelectModeActive = false;
    this.selectedElement = null;
    this.hoveredElement = null;
    this.highlightOverlay = null;
    this.selectionOverlay = null;
    this.parentOrigin = '*';
    this.init();
  }

  init() {
    window.addEventListener('message', this.handleParentMessage.bind(this));
    this.createOverlays();
    this.sendToParent({ type: 'VISUAL_EDITOR_READY', url: window.location.href });
  }

  createOverlays() {
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.style.cssText = 'position: absolute; pointer-events: none; border: 2px solid #3b82f6; background-color: rgba(59, 130, 246, 0.1); z-index: 999999; display: none;';
    document.body.appendChild(this.highlightOverlay);

    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.style.cssText = 'position: absolute; pointer-events: none; border: 2px solid #ef4444; background-color: rgba(239, 68, 68, 0.1); z-index: 999999; display: none;';
    document.body.appendChild(this.selectionOverlay);
  }

  handleParentMessage(event) {
    if (this.parentOrigin === '*') this.parentOrigin = event.origin;
    const { type, data } = event.data;
    if (type === 'ACTIVATE_SELECT_MODE') this.activateSelectMode();
    else if (type === 'DEACTIVATE_SELECT_MODE') this.deactivateSelectMode();
    else if (type === 'UPDATE_ELEMENT_PROPERTY') this.updateElementProperty(data);
  }

  activateSelectMode() {
    this.isSelectModeActive = true;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    this.sendToParent({ type: 'SELECT_MODE_ACTIVATED' });
  }

  deactivateSelectMode() {
    this.isSelectModeActive = false;
    document.body.style.cursor = 'default';
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this));
    this.highlightOverlay.style.display = 'none';
    this.selectionOverlay.style.display = 'none';
    this.hoveredElement = null;
    this.selectedElement = null;
    this.sendToParent({ type: 'SELECT_MODE_DEACTIVATED' });
  }

  handleMouseOver(event) {
    if (!this.isSelectModeActive) return;
    event.stopPropagation();
    this.hoveredElement = event.target;
    this.highlightElement(event.target, this.highlightOverlay);
  }

  handleMouseOut(event) {
    if (!this.isSelectModeActive) return;
    this.hoveredElement = null;
    this.highlightOverlay.style.display = 'none';
  }

  handleClick(event) {
    if (!this.isSelectModeActive) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedElement = event.target;
    this.highlightElement(event.target, this.selectionOverlay);
    const elementData = this.extractElementData(event.target);
    this.sendToParent({ type: 'ELEMENT_SELECTED', element: elementData });
  }

  highlightElement(element, overlay) {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    overlay.style.display = 'block';
    overlay.style.left = (rect.left + scrollX) + 'px';
    overlay.style.top = (rect.top + scrollY) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  extractElementData(element) {
    const computedStyles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      textContent: element.textContent?.trim().substring(0, 100) || '',
      innerHTML: element.innerHTML,
      computedStyles: {
        display: computedStyles.display,
        position: computedStyles.position,
        margin: computedStyles.margin,
        padding: computedStyles.padding,
        width: computedStyles.width,
        height: computedStyles.height,
        fontSize: computedStyles.fontSize,
        fontFamily: computedStyles.fontFamily,
        fontWeight: computedStyles.fontWeight,
        color: computedStyles.color,
        backgroundColor: computedStyles.backgroundColor,
        border: computedStyles.border,
        borderRadius: computedStyles.borderRadius,
        textAlign: computedStyles.textAlign,
        opacity: computedStyles.opacity,
        zIndex: computedStyles.zIndex,
        transform: computedStyles.transform,
        overflow: computedStyles.overflow
      },
      boundingRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      elementPath: this.getElementPath(element)
    };
  }

  getElementPath(element) {
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) selector += '#' + current.id;
      else if (current.className) selector += '.' + current.className.split(' ').join('.');
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  updateElementProperty(data) {
    console.log('Update element property (fallback):', data);
  }

  sendToParent(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, this.parentOrigin);
    }
  }
}

// Initialize the Visual Editor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.curioVisualEditor = new CurioVisualEditor();
  });
} else {
  window.curioVisualEditor = new CurioVisualEditor();
}

// Export for module systems  
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CurioVisualEditor;
}`;
  }
}