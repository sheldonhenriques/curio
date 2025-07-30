import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { Daytona } from '@daytonaio/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getProjectByIdInternal, getChatSessionByNodeIdInternal } from './src/utils/supabase/service.js';
// Note: Using Daytona SDK's executeCommand instead of spawn for better sandbox integration

// Import session cleanup service (will be lazy loaded when needed)
let sessionCleanupService = null;

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active chat sessions
const chatSessions = new Map();

// Store incomplete JSON buffers for each WebSocket connection
const jsonBuffers = new Map();

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
  const wss = new WebSocketServer({ 
    server,
    path: '/api/claude-ws'
  });

  wss.on('connection', (ws, req) => {
    // Initialize JSON buffer for this connection
    const connectionId = uuidv4();
    ws.connectionId = connectionId;
    jsonBuffers.set(connectionId, '');

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

    ws.on('error', () => {
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
      // Clean up JSON buffer for this connection
      if (ws.connectionId) {
        jsonBuffers.delete(ws.connectionId);
      }
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
      // Get project data using service client (bypasses authentication)
      const project = await getProjectByIdInternal(projectId);
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

      // Check for existing Claude session in database first using service client
      let claudeSessionId = null;
      try {
        const data = await getChatSessionByNodeIdInternal(nodeId, projectId);
        if (data.session && data.session.sessionId) {
          claudeSessionId = data.session.sessionId;
        }
      } catch (error) {
        console.log('[Chat] No existing session found, will create new one');
      }

      // Generate session key for this WebSocket session (different from Claude session)
      const sessionKey = sessionId || uuidv4();
      
      // Get project directory
      const projectDir = `${await sandbox.getUserRootDir()}/project`;

      await executeClaudeCLI(ws, prompt, sessionKey, sandbox, projectDir, claudeSessionId);

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

  async function executeClaudeCLI(ws, prompt, sessionKey, sandbox, projectDir, claudeSessionId) {
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
        let claudeCommand;
        if (claudeSessionId) {
          // Use existing Claude session for conversation continuity
          claudeCommand = `cd "${projectDir}" && cat "${promptFile}" | claude -r ${claudeSessionId} --print --output-format stream-json --verbose --max-turns 15 --allowedTools "Edit,Write,MultiEdit,Read,Bash,Glob,Grep"`;
        } else {
          // No existing session - make normal call (Claude will generate new session ID)
          claudeCommand = `cd "${projectDir}" && cat "${promptFile}" | claude --print --output-format stream-json --verbose --max-turns 15 --allowedTools "Edit,Write,MultiEdit,Read,Bash,Glob,Grep"`;
        }

        // Execute command and stream output
        const sessionCommand = await sandbox.process.executeSessionCommand(streamSessionId, {
          command: claudeCommand,
          runAsync: true,
          env: {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          }
        });

        const cmdId = sessionCommand.cmdId;

        // Stream the output in real-time with timeout
        try {
          let outputReceived = false;
          const streamTimeout = setTimeout(() => {
            if (!outputReceived) {
              safeSend(ws, {
                type: 'error', 
                message: 'Claude command timed out - no output received'
              });
            }
          }, 30000);

          await sandbox.process.getSessionCommandLogs(streamSessionId, cmdId, (chunk) => {
            if (chunk && chunk.trim()) {
              outputReceived = true;
              clearTimeout(streamTimeout);
              // Parse and send the chunk immediately with buffering
              // Completion detection happens in parseClaudeStreamChunk
              parseClaudeStreamChunkWithBuffering(ws, chunk);
            }
          });
          clearTimeout(streamTimeout);
        } catch (streamError) {
          safeSend(ws, {
            type: 'error',
            message: `Streaming error: ${streamError.message}`
          });
        }
        
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

  function parseClaudeStreamChunkWithBuffering(ws, chunk) {
    if (!chunk || !ws.connectionId) {
      return;
    }
    
    // Get the current buffer for this connection
    let buffer = jsonBuffers.get(ws.connectionId) || '';
    
    // Add new chunk to buffer
    buffer += chunk;
    
    // Try to extract complete JSON objects from the buffer
    let processed = '';
    let currentPos = 0;
    
    while (currentPos < buffer.length) {
      // Find the start of a potential JSON object
      const startPos = buffer.indexOf('{', currentPos);
      if (startPos === -1) {
        // No more JSON objects to process
        break;
      }
      
      // Try to find the matching closing brace
      let braceCount = 0;
      let endPos = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startPos; i < buffer.length; i++) {
        const char = buffer[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\' && inString) {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPos = i;
              break;
            }
          }
        }
      }
      
      if (endPos !== -1) {
        // Found complete JSON object
        const jsonStr = buffer.substring(startPos, endPos + 1);
        processed += buffer.substring(currentPos, endPos + 1);
        currentPos = endPos + 1;
        
        try {
          const claudeMessage = JSON.parse(jsonStr);
          processClaudeMessage(ws, claudeMessage);
        } catch (parseError) {
          // Failed to parse JSON - skip malformed message
        }
      } else {
        // Incomplete JSON object, stop processing and keep in buffer
        break;
      }
    }
    
    // Update buffer with remaining unprocessed content
    const remainingBuffer = buffer.substring(currentPos);
    jsonBuffers.set(ws.connectionId, remainingBuffer);
    
    // If buffer gets too large (> 100KB), clear it to prevent memory issues
    if (remainingBuffer.length > 100000) {
      jsonBuffers.set(ws.connectionId, '');
    }
  }

  function processClaudeMessage(ws, claudeMessage) {
    // Skip init messages and system setup messages
    if (claudeMessage.type === 'system' && claudeMessage.subtype === 'init') {
      return; // Don't send init messages
    }
    
    // Check for completion/final messages
    if (claudeMessage.type === 'result') {
      // Send completion signal when Claude is done (just to stop loading, no bubble)
      safeSend(ws, {
        type: 'complete',
        message: claudeMessage.result || '' // Send the result message if available
      });
      return;
    }
    
    if (claudeMessage.type === 'system' && claudeMessage.subtype === 'session_end') {
      safeSend(ws, {
        type: 'complete',
        message: ''
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

  // Socket.IO server for real-time project updates
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('🔌 Socket.IO client connected:', socket.id);

    // Handle client disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO client disconnected:', socket.id, reason);
    });

    // Handle room joining (for user-specific updates)
    socket.on('join', (data) => {
      const { userId } = data;
      if (userId) {
        socket.join(`user-${userId}`);
        console.log(`🔌 Socket ${socket.id} joined user room: user-${userId}`);
      }
    });
  });

  // Store Socket.IO instance globally for broadcast access
  global.socketIO = io;

  server.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, async () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    
    // Start session cleanup service
    try {
      const { default: cleanup } = await import('./src/lib/sessionCleanup.js');
      sessionCleanupService = cleanup;
      sessionCleanupService.start();
    } catch (error) {
      console.error('Failed to start session cleanup service:', error);
    }
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    if (sessionCleanupService) {
      sessionCleanupService.stop();
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    if (sessionCleanupService) {
      sessionCleanupService.stop();
    }
    process.exit(0);
  });
});