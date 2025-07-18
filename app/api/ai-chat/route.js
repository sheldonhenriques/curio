import { Daytona } from "@daytonaio/sdk";
import connectToDatabase from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';

export async function POST(req) {
  try {
    const { prompt, projectId, nodeId, sessionId } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!nodeId) {
      return new Response(
        JSON.stringify({ error: "Node ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing API keys" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[AI-CHAT] Processing request for project:", projectId);
    console.log("[AI-CHAT] Node ID:", nodeId);
    console.log("[AI-CHAT] Session ID:", sessionId);
    console.log("[AI-CHAT] User prompt:", prompt);
    
    // Connect to database
    await connectToDatabase();
    
    // Get project data to retrieve sandbox ID
    const projectResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${projectId}`);
    if (!projectResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const project = await projectResponse.json();
    if (!project.sandboxId) {
      return new Response(
        JSON.stringify({ error: "Project does not have an active sandbox" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[AI-CHAT] Using sandbox:", project.sandboxId);
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the async processing
    (async () => {
      try {
        // Initialize Daytona SDK to check sandbox status
        const daytona = new Daytona({
          apiKey: process.env.DAYTONA_API_KEY,
        });

        // Check if sandbox exists and is accessible
        const sandboxes = await daytona.list();
        const sandbox = sandboxes.find(s => s.id === project.sandboxId);
        
        if (!sandbox) {
          throw new Error(`Sandbox ${project.sandboxId} not found or not accessible`);
        }

        console.log("[AI-CHAT] Sandbox found and accessible");

        // Send initial status
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "status", 
            message: "Connected to project sandbox" 
          })}\n\n`)
        );
        
        // Load or create session
        let currentSession = null;
        if (sessionId) {
          currentSession = await ChatSession.findOne({ sessionId, nodeId, isActive: true });
          if (!currentSession) {
            console.log("[AI-CHAT] Session not found, creating new session");
          }
        }
        
        // Store user message
        const userMessageId = new Date().getTime().toString();
        if (currentSession) {
          await currentSession.addMessage('user', prompt, { timestamp: new Date() });
        }

        // Prepare Claude Code CLI command
        const contextPrompt = `${prompt}

IMPORTANT CONTEXT:
- You are working in an existing Next.js project located in the /project directory
- The project is already set up and running - DO NOT create a new project
- Focus on making specific modifications, improvements, or additions to the existing codebase
- Use Read tool first to understand the current project structure
- Make targeted changes based on the user's request
- Ensure any changes maintain the existing project structure and don't break functionality
- Be surgical in your modifications - only change what's needed`;
        
        // Build Claude Code CLI command
        let claudeCommand;
        if (sessionId && currentSession) {
          claudeCommand = `claude -p --resume ${sessionId} --output-format json "${contextPrompt.replace(/"/g, '\\"')}"`;
        } else {
          claudeCommand = `claude -p --output-format json "${contextPrompt.replace(/"/g, '\\"')}"`;
        }

        // Send execution start status
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "status", 
            message: currentSession ? "Resuming conversation..." : "Starting new conversation..." 
          })}\n\n`)
        );

        // Get the project directory in the sandbox
        const projectDir = `${await sandbox.getUserRootDir()}/project`;
        
        console.log("[AI-CHAT] Executing Claude Code CLI command:", claudeCommand);

        // Execute Claude Code CLI
        const execResult = await sandbox.process.executeCommand(
          claudeCommand,
          projectDir,
          {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          },
          600 // 10 minute timeout
        );

        // Parse Claude Code CLI JSON output
        let extractedSessionId = null;
        const messages = [];
        
        try {
          // Try to parse as JSON first
          const jsonOutput = JSON.parse(execResult.result);
          
          // Extract session ID if present
          if (jsonOutput.session_id) {
            extractedSessionId = jsonOutput.session_id;
          }
          
          // Process messages array
          if (jsonOutput.messages && Array.isArray(jsonOutput.messages)) {
            for (const msg of jsonOutput.messages) {
              messages.push(msg);
              
              // Stream different message types
              if (msg.type === 'text') {
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "claude_message", 
                    content: msg.text || msg.content 
                  })}\n\n`)
                );
              } else if (msg.type === 'tool_use') {
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "tool_use", 
                    name: msg.name,
                    input: msg.input 
                  })}\n\n`)
                );
              } else if (msg.type === 'tool_result') {
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "tool_result", 
                    result: msg.result 
                  })}\n\n`)
                );
              }
            }
          }
        } catch (parseError) {
          // If not valid JSON, treat as plain text output
          console.log("[AI-CHAT] Non-JSON output, parsing as text");
          
          const outputLines = execResult.result.split('\n');
          for (const line of outputLines) {
            const output = line.trim();
            if (output) {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: "progress", 
                  message: output 
                })}\n\n`)
              );
            }
          }
        }

        if (execResult.exitCode !== 0) {
          throw new Error("Claude Code execution failed");
        }

        // Create or update session in database
        if (extractedSessionId) {
          if (!currentSession) {
            // Create new session
            currentSession = new ChatSession({
              sessionId: extractedSessionId,
              nodeId,
              projectId,
              messages: [],
              isActive: true
            });
            await currentSession.save();
            console.log("[AI-CHAT] Created new session:", extractedSessionId);
          } else {
            // Update existing session
            currentSession.sessionId = extractedSessionId;
            await currentSession.save();
          }
          
          // Store all messages in database
          for (const msg of messages) {
            if (msg.type === 'text') {
              await currentSession.addMessage('assistant', msg.text || msg.content, { 
                timestamp: new Date(),
                messageType: 'text' 
              });
            } else if (msg.type === 'tool_use') {
              await currentSession.addMessage('tool_use', JSON.stringify(msg), { 
                timestamp: new Date(),
                toolName: msg.name,
                toolInput: msg.input 
              });
            } else if (msg.type === 'tool_result') {
              await currentSession.addMessage('tool_result', msg.result, { 
                timestamp: new Date(),
                messageType: 'tool_result' 
              });
            }
          }
          
          // Send session ID to client
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ 
              type: "session_id",
              sessionId: extractedSessionId 
            })}\n\n`)
          );
        }

        // Send completion
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "complete",
            message: "Project modification completed successfully!" 
          })}\n\n`)
        );
        
        console.log("[AI-CHAT] Modification completed successfully");
        
        // Send done signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        
      } catch (error) {
        console.error("[AI-CHAT] Error during modification:", error);
        
        // Store error in session if available
        if (currentSession) {
          await currentSession.addMessage('error', error.message, { 
            timestamp: new Date(),
            errorType: 'execution_error' 
          });
        }
        
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            message: error.message 
          })}\n\n`)
        );
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await writer.close();
      }
    })();
    
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    
  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}