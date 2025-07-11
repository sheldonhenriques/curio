"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MessageCircle, Send, Bot, User, Loader2 } from "lucide-react"
import BaseNode from "@/components/nodes/basenode"

const AI_CHAT_SIZES = {
    compact: { width: 400, height: 500, icon: <MessageCircle className="w-4 h-4" /> },
    normal: { width: 480, height: 600, icon: <MessageCircle className="w-4 h-4" /> },
    expanded: { width: 560, height: 700, icon: <MessageCircle className="w-4 h-4" /> },
}

export default function AIChatNode({ id, data, selected, ...props }) {
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [streamingMessage, setStreamingMessage] = useState("")
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    // Load persisted messages on component mount
    useEffect(() => {
        const savedMessages = localStorage.getItem(`aichat-${id}`)
        if (savedMessages) {
            setMessages(JSON.parse(savedMessages))
        }
    }, [id])

    // Save messages to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`aichat-${id}`, JSON.stringify(messages))
        }
    }, [messages, id])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, streamingMessage])

    const executeAICommand = async (prompt) => {
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
                body: JSON.stringify({ prompt }),
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

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        if (!inputValue.trim() || isLoading) return

        const prompt = inputValue.trim()
        setInputValue("")
        
        await executeAICommand(prompt)
    }, [inputValue, isLoading])

    const handleClearChat = useCallback(() => {
        setMessages([])
        localStorage.removeItem(`aichat-${id}`)
    }, [id])

    return (
        <BaseNode
            id={id}
            data={data}
            selected={selected}
            nodeType="aichatNode"
            sizeOptions={AI_CHAT_SIZES}
            {...props}
        >
            <div className="flex flex-col h-full backdrop-blur-md bg-white/70 border border-white/20 rounded-lg shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/10">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-800">AI Chat</span>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        Clear
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <Bot className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>Start a conversation with AI</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {message.type === "ai" && (
                                    <div className="flex-shrink-0">
                                        <Bot className="w-6 h-6 text-blue-600" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg ${
                                        message.type === "user"
                                            ? "bg-blue-600 text-white"
                                            : message.isError
                                            ? "bg-red-100 text-red-800 border border-red-200"
                                            : "bg-white/80 text-gray-800 border border-white/20"
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>
                                {message.type === "user" && (
                                    <div className="flex-shrink-0">
                                        <User className="w-6 h-6 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-white/20 bg-white/10">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask AI anything..."
                            className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </BaseNode>
    )
}