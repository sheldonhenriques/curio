"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MessageCircle, Send, Bot, User, Loader2 } from "lucide-react"
import BaseNode from "@/components/nodes/basenode"
import { executeAICommand } from "@/components/nodes/aichat/aiService"

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


    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        if (!inputValue.trim() || isLoading) return

        const prompt = inputValue.trim()
        setInputValue("")
        
        await executeAICommand(prompt, setIsLoading, setMessages, setStreamingMessage)
    }, [inputValue, isLoading, setIsLoading, setMessages, setStreamingMessage])

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
                <div className="flex-1 overflow-hidden p-4 space-y-4">
                    <div 
                        className="h-full overflow-y-auto overflow-x-hidden space-y-4 chat-messages nowheel"
                        onWheel={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
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
                                    className={`max-w-[80%] p-3 rounded-lg break-words ${
                                        message.type === "user"
                                            ? "bg-blue-600 text-white"
                                            : message.isError
                                            ? "bg-red-100 text-red-800 border border-red-200"
                                            : "bg-white/80 text-gray-800 border border-white/20"
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-white/20 bg-white/10 nowheel">
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