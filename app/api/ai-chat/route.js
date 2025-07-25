import { Daytona } from "@daytonaio/sdk";
import { createClient } from '@/utils/supabase/server';
import { getProjectByIdInternal } from '@/utils/supabase/service';

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

    // Initialize Supabase client
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get project data to retrieve sandbox ID using service client
    try {
      var project = await getProjectByIdInternal(projectId);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!project.sandboxId) {
      return new Response(
        JSON.stringify({ error: "Project does not have an active sandbox" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    
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
          const { data: sessionData } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .eq('node_id', nodeId)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          currentSession = sessionData;
        }
        
        // Store user message
        const userMessageId = new Date().getTime().toString();
        if (currentSession) {
          await supabase
            .from('messages')
            .insert({
              message_id: userMessageId,
              chat_session_id: currentSession.id,
              type: 'user',
              content: prompt,
              metadata: { timestamp: new Date().toISOString() }
            });
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
            const { data: newSessionData } = await supabase
              .from('chat_sessions')
              .insert({
                session_id: extractedSessionId,
                user_id: user.id,
                node_id: nodeId,
                project_id: parseInt(projectId),
                is_active: true
              })
              .select()
              .single();
            
            currentSession = newSessionData;
          } else {
            // Update existing session
            await supabase
              .from('chat_sessions')
              .update({ session_id: extractedSessionId })
              .eq('id', currentSession.id);
            
            currentSession.session_id = extractedSessionId;
          }
          
          // Store all messages in database
          const messagesToInsert = [];
          for (const msg of messages) {
            const messageId = new Date().getTime().toString() + Math.random().toString(36).substring(2, 11);
            
            if (msg.type === 'text') {
              messagesToInsert.push({
                message_id: messageId,
                chat_session_id: currentSession.id,
                type: 'assistant',
                content: msg.text || msg.content,
                metadata: { 
                  timestamp: new Date().toISOString(),
                  messageType: 'text' 
                }
              });
            } else if (msg.type === 'tool_use') {
              messagesToInsert.push({
                message_id: messageId,
                chat_session_id: currentSession.id,
                type: 'tool_use',
                content: JSON.stringify(msg),
                metadata: { 
                  timestamp: new Date().toISOString(),
                  toolName: msg.name,
                  toolInput: msg.input 
                }
              });
            } else if (msg.type === 'tool_result') {
              messagesToInsert.push({
                message_id: messageId,
                chat_session_id: currentSession.id,
                type: 'tool_result',
                content: msg.result,
                metadata: { 
                  timestamp: new Date().toISOString(),
                  messageType: 'tool_result' 
                }
              });
            }
          }
          
          if (messagesToInsert.length > 0) {
            await supabase
              .from('messages')
              .insert(messagesToInsert);
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
        
        
        // Send done signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        
      } catch (error) {
        console.error("[AI-CHAT] Error during modification:", error);
        
        // Store error in session if available
        if (currentSession) {
          const errorMessageId = new Date().getTime().toString() + Math.random().toString(36).substring(2, 11);
          await supabase
            .from('messages')
            .insert({
              message_id: errorMessageId,
              chat_session_id: currentSession.id,
              type: 'error',
              content: error.message,
              metadata: { 
                timestamp: new Date().toISOString(),
                errorType: 'execution_error' 
              }
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