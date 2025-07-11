export const executeAICommand = async (prompt, setIsLoading, setMessages, setStreamingMessage) => {
    try {
        setIsLoading(true)
        setStreamingMessage("")

        // Add user message
        const userMessage = { id: Date.now(), type: "user", content: prompt, timestamp: new Date() }
        setMessages(prev => [...prev, userMessage])

        // Start AI response
        const aiMessage = { id: Date.now() + 1, type: "ai", content: "", timestamp: new Date() }
        setMessages(prev => [...prev, aiMessage])

        // Execute the actual command with streaming
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout

        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, sandboxIdArg : "8a68fc00-fcd4-4170-a625-3242aa7fd6b1" }),
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ""

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                accumulatedContent += chunk

                setMessages(prev => prev.map(msg =>
                    msg.id === aiMessage.id
                        ? { ...msg, content: accumulatedContent }
                        : msg
                ))
            }
        } catch (readerError) {
            if (readerError.name === 'AbortError') {
                throw new Error('Request timed out after 5 minutes')
            }
            throw readerError
        }

    } catch (error) {
        console.error("Error executing AI command:", error)
        const errorMessage = {
            id: Date.now() + 2,
            type: "ai",
            content: `Sorry, I encountered an error while processing your request: ${error.message}`,
            timestamp: new Date(),
            isError: true
        }
        setMessages(prev => [...prev, errorMessage])
    } finally {
        setIsLoading(false)
        setStreamingMessage("")
    }
}