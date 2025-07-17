import { Daytona } from "@daytonaio/sdk";

export async function POST(req) {
  try {
    const { prompt, projectId } = await req.json();
    
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
    
    if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing API keys" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[AI-CHAT] Processing request for project:", projectId);
    console.log("[AI-CHAT] User prompt:", prompt);
    
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

        // Create the Claude Code modification script
        const modificationScript = `
const { query } = require('@anthropic-ai/claude-code');

async function modifyProject() {
  const prompt = \`${prompt.replace(/`/g, '\\`').replace(/\$/g, '\\$')}
  
  IMPORTANT CONTEXT:
  - You are working in an existing Next.js project located in the /project directory
  - The project is already set up and running - DO NOT create a new project
  - Focus on making specific modifications, improvements, or additions to the existing codebase
  - Use Read tool first to understand the current project structure
  - Make targeted changes based on the user's request
  - Ensure any changes maintain the existing project structure and don't break functionality
  - Be surgical in your modifications - only change what's needed
  \`;

  console.log('Starting project modification with Claude Code...');
  console.log('Working directory:', process.cwd());
  
  const messages = [];
  const abortController = new AbortController();
  
  try {
    for await (const message of query({
      prompt: prompt,
      abortController: abortController,
      options: {
        maxTurns: 15,
        allowedTools: [
          'Read',
          'Write', 
          'Edit',
          'MultiEdit',
          'Bash',
          'LS',
          'Glob',
          'Grep'
        ]
      }
    })) {
      messages.push(message);
      
      // Log progress with structured markers for parsing
      if (message.type === 'text') {
        const content = message.text || '';
        console.log('[Claude]:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
        console.log('__CLAUDE_MESSAGE__', JSON.stringify({ 
          type: 'assistant', 
          content: content 
        }));
      } else if (message.type === 'tool_use') {
        console.log('[Tool]:', message.name, message.input?.file_path || '');
        console.log('__TOOL_USE__', JSON.stringify({ 
          type: 'tool_use', 
          name: message.name, 
          input: message.input 
        }));
      } else if (message.type === 'result') {
        // Only log successful tool results to reduce noise
        if (!message.result?.includes('Error') && !message.result?.includes('error')) {
          console.log('__TOOL_RESULT__', JSON.stringify({ 
            type: 'tool_result', 
            result: message.result?.substring(0, 200) + (message.result?.length > 200 ? '...' : '')
          }));
        }
      }
    }
    
    console.log('\\nModification complete!');
    console.log('Total messages processed:', messages.length);
    
  } catch (error) {
    console.error('Modification error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

modifyProject().catch(console.error);
`;

        // Send script creation status
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "status", 
            message: "Creating modification script..." 
          })}\n\n`)
        );

        // Get the project directory in the sandbox
        const projectDir = `${await sandbox.getUserRootDir()}/project`;
        
        // Install Claude Code SDK in the project if not present
        await sandbox.process.executeCommand(
          `npm list @anthropic-ai/claude-code || npm install @anthropic-ai/claude-code`,
          projectDir
        );

        // Write the modification script to the sandbox
        await sandbox.process.executeCommand(
          `cat > modify-project.js << 'SCRIPT_EOF'
${modificationScript}
SCRIPT_EOF`,
          projectDir
        );

        console.log("[AI-CHAT] Modification script created in sandbox");

        // Send execution start status
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "status", 
            message: "Starting Claude Code execution..." 
          })}\n\n`)
        );

        // Execute the modification script
        const execResult = await sandbox.process.executeCommand(
          "node modify-project.js",
          projectDir,
          {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            NODE_PATH: `${projectDir}/node_modules`,
          },
          600 // 10 minute timeout
        );

        // Parse and stream the output
        const outputLines = execResult.result.split('\n');
        
        for (const line of outputLines) {
          if (!line.trim()) continue;
          
          // Parse Claude messages
          if (line.includes('__CLAUDE_MESSAGE__')) {
            const jsonStart = line.indexOf('__CLAUDE_MESSAGE__') + '__CLAUDE_MESSAGE__'.length;
            try {
              const message = JSON.parse(line.substring(jsonStart).trim());
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: "claude_message", 
                  content: message.content 
                })}\n\n`)
              );
            } catch (e) {
              // Ignore parse errors
            }
          }
          // Parse tool uses
          else if (line.includes('__TOOL_USE__')) {
            const jsonStart = line.indexOf('__TOOL_USE__') + '__TOOL_USE__'.length;
            try {
              const toolUse = JSON.parse(line.substring(jsonStart).trim());
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: "tool_use", 
                  name: toolUse.name,
                  input: toolUse.input 
                })}\n\n`)
              );
            } catch (e) {
              // Ignore parse errors
            }
          }
          // Parse tool results
          else if (line.includes('__TOOL_RESULT__')) {
            const jsonStart = line.indexOf('__TOOL_RESULT__') + '__TOOL_RESULT__'.length;
            try {
              const toolResult = JSON.parse(line.substring(jsonStart).trim());
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: "tool_result", 
                  result: toolResult.result 
                })}\n\n`)
              );
            } catch (e) {
              // Ignore parse errors
            }
          }
          // Regular progress messages
          else {
            const output = line.trim();
            
            // Filter out internal logs but keep meaningful progress
            if (output && 
                !output.includes('[Claude]:') && 
                !output.includes('[Tool]:') &&
                !output.includes('__') &&
                !output.startsWith('Working directory:') &&
                !output.startsWith('Total messages:')) {
              
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