const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const { Daytona } = require('@daytonaio/sdk');
const { v4: uuidv4 } = require('uuid');
// Note: Using Daytona SDK's executeCommand instead of spawn for better sandbox integration

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active chat sessions
const chatSessions = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // WebSocket server for AI chat
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/claude-ws'
  });

  wss.on('connection', (ws, req) => {
    // Send initial connection confirmation
    safeSend(ws, {
      type: 'connection',
      message: 'Connected to Claude Code WebSocket'
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleChatMessage(ws, message);
      } catch (error) {
        safeSend(ws, {
          type: 'error',
          message: `Failed to process message: ${error.message}`
        });
      }
    });

    ws.on('close', (code, reason) => {
      // Connection closed - cleanup will happen automatically
    });

    ws.on('error', (error) => {
      // WebSocket error - connection will be closed
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  // Helper function to safely send WebSocket messages
  function safeSend(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  }

  async function handleChatMessage(ws, message) {
    const { type, prompt, projectId, nodeId, sessionId } = message;

    if (type !== 'chat') {
      safeSend(ws, { type: 'error', message: 'Invalid message type' });
      return;
    }

    if (!prompt || !projectId || !nodeId) {
      safeSend(ws, { type: 'error', message: 'Missing required fields: prompt, projectId, nodeId' });
      return;
    }

    try {
      // Get project data
      const projectResponse = await fetch(`http://localhost:${port}/api/projects/${projectId}`);
      if (!projectResponse.ok) {
        throw new Error('Project not found');
      }

      const project = await projectResponse.json();
      if (!project.sandboxId) {
        throw new Error('Project does not have an active sandbox');
      }

      // Initialize Daytona SDK
      const daytona = new Daytona({
        apiKey: process.env.DAYTONA_API_KEY,
      });

      // Check sandbox status
      const sandboxes = await daytona.list();
      const sandbox = sandboxes.find(s => s.id === project.sandboxId);
      
      if (!sandbox) {
        throw new Error('Sandbox not found or not accessible. Please refresh the page.');
      }

      // Generate or use existing session UUID
      const sessionKey = sessionId || uuidv4();
      
      // Get project directory
      const projectDir = `${await sandbox.getUserRootDir()}/project`;

      await executeClaudeCLI(ws, prompt, sessionKey, sandbox, projectDir);

      // Update session activity
      chatSessions.set(sessionKey, {
        projectId,
        nodeId,
        lastActivity: Date.now()
      });

      // Completion message will be sent automatically when Claude CLI finishes
      // via parseClaudeStreamChunk detection

    } catch (error) {
      
      // Handle specific error cases
      let errorMessage = error.message;
      if (error.message.includes('Sandbox not found') || error.message.includes('not accessible')) {
        errorMessage = 'Sandbox is unavailable. This may be due to inactivity. Please refresh the page to restart the sandbox.';
      }

      safeSend(ws, {
        type: 'error',
        message: errorMessage
      });
    }
  }

  async function executeClaudeCLI(ws, prompt, sessionKey, sandbox, projectDir) {
    return new Promise(async (resolve, reject) => {
      // Prepare the enhanced prompt with context
      const enhancedPrompt = `${prompt}

IMPORTANT CONTEXT:
- You are working in an existing Next.js project in the /project directory
- This project is already set up and running - DO NOT create a new project
- Focus on making specific modifications, improvements, or additions to the existing codebase
- Use Read tool first to understand the current project structure
- Make targeted changes based on the user's request
- Ensure changes maintain existing project structure and functionality
- Be surgical in your modifications - only change what's needed`;

      // Create a safe command by writing the prompt to a file first
      const promptFile = `/tmp/claude_prompt_${sessionKey.replace(/-/g, '')}.txt`;
      const writePromptCommand = `cat > "${promptFile}" << 'EOF'\n${enhancedPrompt}\nEOF`;

      try {
        // Step 1: Write prompt to file
        await sandbox.process.executeCommand(writePromptCommand, projectDir);

        // Step 2: Create session for streaming execution
        // Always use a unique session ID for Daytona sandbox to avoid conflicts
        const uniqueExecutionId = uuidv4();
        const streamSessionId = `claude-stream-${uniqueExecutionId}`;
        
        await sandbox.process.createSession(streamSessionId);
        
        // Step 3: Execute Claude CLI with session streaming
        const claudeCommand = `cd "${projectDir}" && cat "${promptFile}" | claude --print --output-format stream-json --verbose --max-turns 15 --allowedTools "Edit,Write,MultiEdit,Read,Bash,Glob,Grep"`;

        // Execute command and stream output
        const sessionCommand = await sandbox.process.executeSessionCommand(streamSessionId, {
          command: claudeCommand,
          runAsync: true,
          env: {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          }
        });

        const cmdId = sessionCommand.cmdId;

        // Stream the output in real-time
        await sandbox.process.getSessionCommandLogs(streamSessionId, cmdId, (chunk) => {
          if (chunk && chunk.trim()) {
            // Parse and send the chunk immediately
            // Completion detection happens in parseClaudeStreamChunk
            parseClaudeStreamChunk(ws, chunk);
          }
        });
        
        // Send completion signal after streaming ends
        safeSend(ws, {
          type: 'complete',
          message: ''
        });
        
        // Clean up session and prompt file
        await sandbox.process.deleteSession(streamSessionId).catch(() => {});
        await sandbox.process.executeCommand(`rm -f "${promptFile}"`, projectDir).catch(() => {});
        
        resolve();

      } catch (error) {
        // Clean up on error
        try {
          await sandbox.process.deleteSession(streamSessionId).catch(() => {});
          await sandbox.process.executeCommand(`rm -f "${promptFile}"`, projectDir).catch(() => {});
        } catch (cleanupError) {
          // Cleanup failed, but continue
        }
        
        reject(error);
      }
    });
  }

  function parseClaudeStreamChunk(ws, chunk) {
    if (!chunk || !chunk.trim()) {
      return;
    }
    
    // Split chunk into lines and process each line that could be JSON
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        // Try to parse as JSON (Claude CLI stream-json format)
        if (line.startsWith('{') && line.endsWith('}')) {
          const claudeMessage = JSON.parse(line);
          
          // Skip init messages and system setup messages
          if (claudeMessage.type === 'system' && claudeMessage.subtype === 'init') {
            return; // Don't send init messages
          }
          
          // Check for completion/final messages
          if (claudeMessage.type === 'result' || 
              claudeMessage.type === 'system' && claudeMessage.subtype === 'session_end' ||
              claudeMessage.type === 'final') {
            // Send completion signal when Claude is done (just to stop loading, no bubble)
            safeSend(ws, {
              type: 'complete',
              message: '' // Empty message - we just want to stop the thinking bubble
            });
            return;
          }
          
          // Send each JSON message as a separate bubble (this handles all message types)
          safeSend(ws, {
            type: 'json_message',
            data: claudeMessage,
            timestamp: Date.now()
          });
          
          // Extract and send session ID updates
          if (claudeMessage.session_id) {
            safeSend(ws, {
              type: 'session_update',
              sessionId: claudeMessage.session_id
            });
          }
        }
        // Handle non-JSON text output - skip since we only want JSON messages now
        // All meaningful content should come through as JSON from Claude CLI
      } catch (parseError) {
        // Skip invalid JSON - we only want clean output
      }
    }
  }

  // Clean and format message content for better display
  function cleanMessageContent(content) {
    if (!content || !content.trim()) {
      return null;
    }

    // Remove [object Object] occurrences
    content = content.replace(/\[object Object\]/g, '');
    
    // Remove excessive whitespace and empty lines
    content = content.replace(/\s+/g, ' ').trim();
    
    // Skip if content is just symbols or very short
    if (content.length < 3 || /^[^\w\s]*$/.test(content)) {
      return null;
    }
    
    // Skip system/debug messages we don't want to show
    const skipPatterns = [
      'Working directory:',
      'curl:',
      'npm',
      'Error:',
      'warning:',
      /^\[.*\]/,  // Skip bracketed log messages
      'claude-code',
      'Checking for updates',
      'Installing',
      'node_modules'
    ];
    
    for (const pattern of skipPatterns) {
      if (typeof pattern === 'string' && content.includes(pattern)) {
        return null;
      } else if (pattern instanceof RegExp && pattern.test(content)) {
        return null;
      }
    }
    
    // Only show thinking messages and important responses
    if (content.includes('Let me') || 
        content.includes('I\'ll') || 
        content.includes('First, I\'ll') ||
        content.includes('I need to') ||
        content.includes('Looking at') ||
        content.includes('Based on')) {
      return `💭 ${content}`;
    }
    
    return null; // By default, don't show non-JSON text
  }

  // Convert Claude CLI JSON message format to our display format (simplified)
  function convertClaudeMessage(claudeMessage) {
    // Handle thinking messages - these are important to show
    if (claudeMessage.type === 'thinking') {
      return {
        type: 'thinking',
        content: claudeMessage.thinking || claudeMessage.content || '',
        display: '💭 Thinking...'
      };
    }
    
    // Handle assistant messages - main responses
    if (claudeMessage.type === 'assistant' && claudeMessage.message) {
      if (claudeMessage.message.content) {
        const textContent = claudeMessage.message.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('');
        
        if (textContent.trim()) {
          return {
            type: 'claude_message',
            content: textContent
          };
        }
      }
    }
    
    return null; // Skip all other message types - they will be shown as raw JSON
  }

  // Clean up old sessions periodically
  setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of chatSessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        chatSessions.delete(sessionId);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  server.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket endpoint: ws://${hostname}:${port}/api/claude-ws`);
  });
});