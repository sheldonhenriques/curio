import { spawn } from 'child_process'

export async function POST(request) {
    try {
        const { prompt } = await request.json()
        
        if (!prompt) {
            return new Response('Prompt is required', { status: 400 })
        }

        // Create a ReadableStream for streaming response
        const stream = new ReadableStream({
            start(controller) {
                const command = 'npx'
                const args = ['tsx', 'scripts/generate-in-daytona.ts', '8c9cfa1d-c054-4c29-84d6-d1eda254123a', prompt]
                
                const process = spawn(command, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true,
                    timeout: 300000 // 5 minutes timeout
                })

                let hasEnded = false
                let hasStarted = false
                let controllerClosed = false

                const cleanup = () => {
                    if (!hasEnded) {
                        hasEnded = true
                        try {
                            if (process && !process.killed) {
                                process.kill('SIGTERM')
                            }
                            if (!controllerClosed) {
                                controllerClosed = true
                                controller.close()
                            }
                        } catch (error) {
                            console.error('Error closing stream:', error)
                        }
                    }
                }

                // Send initial message to indicate processing started
                try {
                    if (!controllerClosed) {
                        controller.enqueue(new TextEncoder().encode('🤖 Processing your request...\n\n'))
                    }
                } catch (error) {
                    console.error('Error sending initial message:', error)
                }

                process.stdout.on('data', (data) => {
                    try {
                        if (!controllerClosed) {
                            const chunk = data.toString()
                            if (!hasStarted) {
                                hasStarted = true
                                // Clear the initial message and start actual response
                                controller.enqueue(new TextEncoder().encode('\n'))
                            }
                            controller.enqueue(new TextEncoder().encode(chunk))
                        }
                    } catch (error) {
                        console.error('Error streaming data:', error)
                    }
                })

                process.stderr.on('data', (data) => {
                    try {
                        if (!controllerClosed) {
                            const errorChunk = `⚠️ Warning: ${data.toString()}`
                            controller.enqueue(new TextEncoder().encode(errorChunk))
                        }
                    } catch (error) {
                        console.error('Error streaming error data:', error)
                    }
                })

                process.on('close', (code) => {
                    try {
                        if (!controllerClosed) {
                            if (code !== 0) {
                                const errorMessage = `\n\n❌ Command failed with exit code ${code}`
                                controller.enqueue(new TextEncoder().encode(errorMessage))
                            } else if (!hasStarted) {
                                // If no output was received but process completed successfully
                                controller.enqueue(new TextEncoder().encode('\n✅ Command completed successfully with no output.'))
                            }
                        }
                    } catch (error) {
                        console.error('Error sending final message:', error)
                    }
                    cleanup()
                })

                process.on('error', (error) => {
                    try {
                        if (!controllerClosed) {
                            const errorMessage = `\n\n💥 Execution error: ${error.message}`
                            controller.enqueue(new TextEncoder().encode(errorMessage))
                        }
                    } catch (streamError) {
                        console.error('Error sending process error:', streamError)
                    }
                    cleanup()
                })

                // Set up timeout cleanup
                setTimeout(() => {
                    if (!hasEnded) {
                        try {
                            if (!controllerClosed) {
                                controller.enqueue(new TextEncoder().encode('\n\n⏱️ Request timed out after 5 minutes'))
                            }
                        } catch (error) {
                            console.error('Error sending timeout message:', error)
                        }
                        cleanup()
                    }
                }, 300000) // 5 minutes
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('API error:', error)
        return new Response(`Server error: ${error.message}`, { status: 500 })
    }
}