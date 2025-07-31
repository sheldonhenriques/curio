"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MessageCircle, Send, Bot, User, Loader2, RefreshCw, AlertCircle, Trash2, Info } from "lucide-react"
import BaseNode from "@/components/nodes/basenode"
import { useClaudeWebSocket } from "@/hooks/useClaudeWebSocket"
import { useChatSession } from "@/hooks/useChatSession"

const AI_CHAT_SIZES = {
    compact: { width: 400, height: 500, icon: <MessageCircle className="w-4 h-4" /> },
    normal: { width: 480, height: 600, icon: <MessageCircle className="w-4 h-4" /> },
    expanded: { width: 560, height: 700, icon: <MessageCircle className="w-4 h-4" /> },
}

// MessageBubble component to handle individual message rendering
function MessageBubble({ message, formatTime }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // User messages
    if (message.type === "user") {
        return (
            <div className="flex gap-3 justify-end">
                <div className="max-w-[80%] p-3 rounded-lg bg-blue-600 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">User</span>
                        <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
                <div className="flex-shrink-0">
                    <User className="w-6 h-6 text-gray-600" />
                </div>
            </div>
        )
    }

    // Tool usage messages (green bubbles)
    if (message.type === "tool_use") {
        const toolDisplay = message.toolData?.input?.file_path 
            ? `${message.content}(${message.toolData.input.file_path})`
            : message.content
        
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">🔧</span>
                    </div>
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-green-600 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{toolDisplay}</span>
                        <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                    </div>
                </div>
            </div>
        )
    }

    // System messages (collapsible)
    if (message.type === "system") {
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">⚙️</span>
                    </div>
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-600 text-white">
                    <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span className="text-xs font-medium">{message.content}</span>
                        <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                    {isExpanded && message.systemData && (
                        <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                            <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                                {JSON.stringify(message.systemData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Thinking messages (from Claude CLI)
    if (message.type === "thinking") {
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-600 text-white">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                    </div>
                </div>
            </div>
        )
    }

    // Claude response messages
    if (message.type === "claude_response") {
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-white/80 text-gray-800 border border-white/20">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Claude</span>
                        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
            </div>
        )
    }

    // Status messages  
    if (message.type === "status") {
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                    <p className="text-sm">{message.content}</p>
                </div>
            </div>
        )
    }

    // Completion messages
    if (message.type === "completion") {
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <Bot className="w-6 h-6 text-green-600" />
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-green-100 text-green-800 border border-green-200">
                    <p className="text-sm">{message.content}</p>
                </div>
            </div>
        )
    }

    // Error messages
    if (message.type === "error") {
        return (
            <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-red-100 text-red-800 border border-red-200">
                    <p className="text-sm">❌ {message.content}</p>
                </div>
            </div>
        )
    }

    return null
}
// remember to clean old implementation of ai-chat ws
export default function AIChatNode({ id, data, selected, ...props }) {
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState('disconnected')
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const pendingMessagesRef = useRef([]) // Track messages that need to be saved once session is created
    const initialTextRef = useRef(null) // Store initial text when no session ID
    const { isConnected, connectionError, sendMessage, subscribe, reconnect } = useClaudeWebSocket()
    const { session, createSession, clearSession, getMessages, getSessionId, hasSession, saveMessage, loadMessages } = useChatSession(id, data?.projectId)

    // Load messages from session when session changes (only on initial load)
    useEffect(() => {
        if (session && messages.length === 0) {
            // Load messages from the messages API
            const loadSessionMessages = async () => {
                try {
                    const sessionMessages = await loadMessages();
                    if (sessionMessages.length > 0) {
                        const formattedMessages = sessionMessages.map(msg => ({
                            id: msg.message_id,
                            type: msg.type,
                            content: msg.content,
                            timestamp: new Date(msg.timestamp),
                            metadata: msg.metadata || {}
                        }));
                        setMessages(formattedMessages);
                    }
                } catch (error) {
                    console.error('Failed to load session messages:', error);
                    // Fallback to embedded messages if API fails
                    const fallbackMessages = getMessages().map(msg => ({
                        id: msg.id,
                        type: msg.type,
                        content: msg.content,
                        timestamp: new Date(msg.timestamp),
                        metadata: msg.metadata
                    }));
                    if (fallbackMessages.length > 0) {
                        setMessages(fallbackMessages);
                    }
                }
            };
            loadSessionMessages();
        }
        // Don't overwrite existing messages when session is created mid-conversation
    }, [session, loadMessages, getMessages, messages.length])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Create session when we receive Claude's session ID
    // Don't create session immediately on mount - wait for Claude's session ID

    // Helper function to save message to session
    const saveMessageToSession = useCallback(async (message) => {
        const sessionId = getSessionId()
        if (sessionId) {
            try {
                await saveMessage(sessionId, {
                    id: message.id,
                    type: message.type,
                    content: message.content,
                    timestamp: message.timestamp,
                    metadata: message.metadata || {}
                })
            } catch (error) {
                console.error('Failed to save message to session:', error)
            }
        }
    }, [getSessionId, session, saveMessage])

    // WebSocket message handler
    useEffect(() => {
        if (!isConnected) return

        const unsubscribe = subscribe((message) => {
            switch (message.type) {
                case 'connection':
                    // Connection established
                    break

                case 'json_message':
                    // Add each JSON message as a separate bubble
                    // Keep thinking message until completion/error
                    const jsonData = message.data
                    let newMessage = null
                    
                    if (jsonData.type === 'tool_use') {
                        newMessage = {
                            id: `${Date.now()}-${Math.random()}`,
                            type: 'tool_use',
                            content: jsonData.name,
                            toolData: jsonData,
                            timestamp: new Date()
                        }
                    } else if (jsonData.type === 'thinking') {
                        newMessage = {
                            id: `${Date.now()}-${Math.random()}`,
                            type: 'thinking',
                            content: jsonData.thinking || jsonData.content || 'Thinking...',
                            timestamp: new Date()
                        }
                    } else if (jsonData.type === 'assistant' && jsonData.message?.content) {
                        const textContent = jsonData.message.content
                            .filter(block => block.type === 'text')
                            .map(block => block.text)
                            .join('')
                        
                        if (textContent.trim()) {
                            newMessage = {
                                id: `${Date.now()}-${Math.random()}`,
                                type: 'claude_response',
                                content: textContent,
                                timestamp: new Date()
                            }
                        }
                    } else if (jsonData.type === 'user' && jsonData.message?.content) {
                        // Handle user message echoes from Claude CLI
                        const textContent = Array.isArray(jsonData.message.content) 
                            ? jsonData.message.content
                                .filter(block => block.type === 'text')
                                .map(block => block.text)
                                .join('')
                            : jsonData.message.content
                        
                        if (textContent.trim()) {
                            // Don't duplicate user messages - we already add them when user sends
                            // Skip these to avoid duplicates
                        }
                    } else if (jsonData.type === 'result') {
                        // Claude CLI result messages
                        if (jsonData.result && jsonData.result.trim()) {
                            newMessage = {
                                id: `${Date.now()}-${Math.random()}`,
                                type: 'claude_response',
                                content: jsonData.result,
                                timestamp: new Date()
                            }
                        }
                    } else if (jsonData.type === 'system' && jsonData.subtype !== 'init') {
                        // Only show non-init system messages
                        newMessage = {
                            id: `${Date.now()}-${Math.random()}`,
                            type: 'system',
                            content: jsonData.subtype || 'System',
                            systemData: jsonData,
                            timestamp: new Date(),
                            isCollapsed: true
                        }
                    } else {
                        // Handle any other JSON message types as raw system messages
                        if (jsonData.type && jsonData.type !== 'system' && jsonData.type !== 'init') {
                            newMessage = {
                                id: `${Date.now()}-${Math.random()}`,
                                type: 'system',
                                content: `${jsonData.type}${jsonData.subtype ? ` (${jsonData.subtype})` : ''}`,
                                systemData: jsonData,
                                timestamp: new Date(),
                                isCollapsed: true
                            }
                        }
                    }
                    
                    if (newMessage) {
                        setMessages(prev => [...prev, newMessage])
                        saveMessageToSession(newMessage)
                    }
                    break

                case 'status':
                case 'progress':
                case 'claude_message':
                case 'tool_use':
                case 'tool_result':
                case 'thinking':
                    // All these are now handled by json_message to prevent duplicates
                    break

                case 'session_update':
                case 'session_id':
                    if (message.sessionId) {
                        // Create session with Claude's session ID if we don't have one
                        if (!hasSession()) {
                            createSession(message.sessionId).then(() => {
                                // After creating session, save any pending messages
                                const messagesToSave = [...pendingMessagesRef.current]
                                pendingMessagesRef.current = []
                                messagesToSave.forEach(msg => saveMessageToSession(msg))
                                
                                // Save stored initial message to DB if available
                                if (initialTextRef.current) {
                                    // Use the session ID directly instead of relying on getSessionId()
                                    saveMessage(message.sessionId, {
                                        id: initialTextRef.current.id,
                                        type: initialTextRef.current.type,
                                        content: initialTextRef.current.content,
                                        timestamp: initialTextRef.current.timestamp,
                                        metadata: initialTextRef.current.metadata || {}
                                    }).catch((error) => {
                                        console.error('Failed to save stored initial message:', error)
                                    })
                                    initialTextRef.current = null // Clear after saving
                                }
                            })
                        }
                    }
                    break

                case 'complete':
                    // Stop loading (removes thinking bubble) - don't add completion bubble if message is empty
                    if (message.message && message.message.trim()) {
                        const completionMessage = {
                            id: `${Date.now()}-${Math.random()}`,
                            type: 'completion',
                            content: message.message,
                            timestamp: new Date()
                        }
                        setMessages(prev => [...prev, completionMessage])
                        saveMessageToSession(completionMessage)
                    }
                    setIsLoading(false)
                    break

                case 'error':
                    // Add error message and stop loading (removes thinking bubble)
                    const errorMessage = {
                        id: `${Date.now()}-${Math.random()}`,
                        type: 'error',
                        content: message.message,
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, errorMessage])
                    saveMessageToSession(errorMessage)
                    setIsLoading(false)
                    break
            }
        })

        return unsubscribe
    }, [isConnected, subscribe, saveMessageToSession, createSession, hasSession])

    // Update connection status
    useEffect(() => {
        if (isConnected) {
            setConnectionStatus('connected')
        } else if (connectionError) {
            setConnectionStatus('error')
        } else {
            setConnectionStatus('connecting')
        }
    }, [isConnected, connectionError])

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        if (!inputValue.trim() || isLoading || !isConnected) return

        const prompt = inputValue.trim()
        setInputValue("")
        setIsLoading(true)

        // Add user message
        const userMessage = { 
            id: Date.now(), 
            type: "user", 
            content: prompt, 
            timestamp: new Date() 
        }
        
        setMessages(prev => [...prev, userMessage])

        // Check if we have a session ID
        const currentSessionId = getSessionId()
        
        if (currentSessionId) {
            // Save to DB immediately if we have session ID
            saveMessageToSession(userMessage)
        } else {
            // Store initial user message for later DB insertion
            initialTextRef.current = userMessage
        }

        // Send message via WebSocket
        const success = sendMessage({
            type: 'chat',
            prompt,
            projectId: data?.projectId,
            nodeId: id,
            sessionId: currentSessionId
        })

        if (!success) {
            setIsLoading(false)
        }
    }, [inputValue, isLoading, isConnected, sendMessage, data?.projectId, id, getSessionId, saveMessageToSession])

    const handleClearChat = useCallback(async () => {
        try {
            await clearSession()
            setMessages([])
        } catch (error) {
            console.error('Failed to clear session:', error)
        }
    }, [clearSession])

    const handleReconnect = useCallback(() => {
        reconnect()
    }, [reconnect])

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
                        <div className={`w-2 h-2 rounded-full ${
                            connectionStatus === 'connected' ? 'bg-green-500' :
                            connectionStatus === 'error' ? 'bg-red-500' :
                            'bg-yellow-500 animate-pulse'
                        }`} title={connectionStatus} />
                        {hasSession() && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Info className="w-3 h-3" />
                                <span title={`Session: ${getSessionId()}`}>Session Active</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {connectionStatus === 'error' && (
                            <button
                                onClick={handleReconnect}
                                className="text-xs text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Reconnect
                            </button>
                        )}
                        <button
                            onClick={handleClearChat}
                            className="text-xs text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
                            title="Clear conversation and start new session"
                        >
                            <Trash2 className="w-3 h-3" />
                            Clear
                        </button>
                    </div>
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
                            {connectionStatus !== 'connected' && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>
                                        {connectionStatus === 'error' ? 'Connection error' : 'Connecting...'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                        {messages.map((message) => (
                            <MessageBubble 
                                key={message.id} 
                                message={message} 
                                formatTime={(timestamp) => {
                                    return new Date(timestamp).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        hour12: false 
                                    })
                                }}
                            />
                        ))}
                        
                        {/* Show thinking message at the bottom if we're loading */}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="flex-shrink-0">
                                    <Bot className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="max-w-[80%] p-3 rounded-lg bg-gray-600 text-white">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        </>
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
                            disabled={isLoading || !isConnected}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading || !isConnected}
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