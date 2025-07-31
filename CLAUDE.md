# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with integrated WebSocket (opens at http://localhost:3000)
- `npm run build` - Build the application for production
- `npm run start` - Start the production server with WebSocket integration
- `npm run lint` - Run Next.js linting

## Architecture Overview

This is a Next.js 15 application built with React 19 that implements a node-based visual interface using ReactFlow. The core concept revolves around different types of interactive nodes that can be arranged on a canvas.

### Key Components

**ReactFlow Canvas System** (`src/components/flow/Canvas.js`):
- Main canvas component using ReactFlow library
- Manages node state, edge connections, and user interactions
- Optimized with ref-based state management for performance

**Node Types**:
- **BaseNode**: Core reusable node component with hover controls and connection handles
- **ChecklistNode**: Task management nodes with interactive checklists
- **WebserverNode**: Live web content with iframe previews and visual editor integration
- **AIChatNode**: AI chat interface with real-time WebSocket communication

**Project Structure**:
- App Router architecture with pages in `app/` directory
- Reusable UI components in `src/components/ui/`
- API routes for project and chat functionality
- WebSocket server integrated with Next.js (`server.js`)

## Database & Authentication

**Database**: Supabase PostgreSQL with authentication system integrated
- **Projects**: User projects with sandbox integration and real-time updates
- **Chat Sessions**: AI chat history and session management
- **Authentication**: GitHub OAuth via Supabase Auth with middleware protection

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server operations

**Key Files**:
- `src/utils/supabase/` - Database client utilities
- `middleware.js` - Route protection and authentication
- `src/hooks/useProjects.js` - Project CRUD operations
- `app/api/projects/` - RESTful project API endpoints
- `app/api/chat-sessions/` - Chat session management

## Sandbox Management System

**Overview**: Integrated Daytona SDK for creating and managing Next.js development environments

**Core Features**:
- **Automatic Creation**: Creates Next.js projects with TypeScript, Tailwind CSS, and ESLint
- **Background Processing**: Asynchronous sandbox creation via job queue system
- **Lifecycle Management**: Start, stop, and monitor sandbox status with real-time updates
- **Visual Editor Integration**: Automatic SDK injection and AST-based ID injection for visual editing
- **Claude Code Integration**: AI chat functionality within sandbox environments

**Environment Variables**:
- `DAYTONA_API_KEY` - Required for Daytona SDK authentication
- `ANTHROPIC_API_KEY` - Required for Claude Code CLI integration

**Key Files**:
- `src/services/sandboxService.js` - Core Daytona SDK integration
- `src/services/backgroundJobs.js` - Async job queue and WebSocket broadcasting
- `src/services/astIdInjector.js` - AST-based ID injection for visual editor
- `app/api/projects/[id]/sandbox/` - Sandbox management API endpoints

## Visual Website Editor System

**Overview**: Visual editor for selecting DOM elements in iframe previews and modifying Tailwind CSS properties in real-time

**Core Features**:
- **Element Selection**: Click to select DOM elements with visual highlighting
- **Property Panel**: Organized Tailwind CSS property controls
- **Real-time Updates**: Changes applied immediately to preview and source files
- **AST-Based Targeting**: Uses unique `data-visual-id` attributes for precise element identification
- **Smart Class Management**: Automatic Tailwind class conflict resolution

**Technical Architecture**:
- **Visual Editor SDK** (`src/services/visual-editor-sdk.js`): Client-side script for element selection
- **Property Panel** (`src/components/nodes/webserver/PropertyPanel.js`): Tailwind property controls
- **AST ID Injection** (`src/services/astIdInjector.js`): Automatic ID generation using Babel AST
- **File Modification API** (`app/api/projects/[id]/sandbox/files/modify/route.js`): Updates JSX/TSX files

**ID Generation Pattern**: `ComponentName_ElementType_Index` (e.g., `UserProfile_div_0`, `Header_button_1`)

**Property Categories**: Layout, Typography, Background & Borders, Content, Advanced

## AI Chat System

**Overview**: Real-time AI chat system with Claude Code CLI integration and persistent session management

**Core Features**:
- **WebSocket Communication**: Real-time bidirectional messaging with auto-reconnection
- **Claude CLI Integration**: Direct execution within sandbox environments with session continuity
- **Session Persistence**: Supabase-backed chat history and message storage
- **Rich Message Types**: User messages, AI responses, tool usage, system messages, and error handling
- **Sandbox Context**: AI operates directly within Next.js project environments

**Technical Architecture**:
- **WebSocket Server** (`server.js`): Integrated WebSocket server with Claude CLI streaming
- **Chat Hooks** (`src/hooks/useClaudeWebSocket.js`, `src/hooks/useChatSession.js`): Connection and session management
- **AI Chat Node** (`src/components/nodes/aichat/index.js`): Chat interface with message bubbles
- **Session API** (`app/api/chat-sessions/`): RESTful endpoints for session management

**Key Features**:
- Auto-reconnection with visual status indicators
- JSON-buffered message parsing for complete responses
- Initial message storage system to prevent race conditions
- Session cleanup and message history management

## WebSocket System

**Overview**: Dual WebSocket system for real-time updates across dashboard and project pages

**Architecture**:
- **Dashboard WebSocket** (`src/hooks/useSocket.js`): User-specific rooms for project updates
- **Project WebSocket** (`src/hooks/useSandboxWebSocket.js`): Project-specific rooms for sandbox status
- **Unified Broadcasting** (`src/services/backgroundJobs.js`): Single function broadcasts to both systems
- **Socket.IO Server** (`server.js`): Handles both WebSocket systems with room management

**Key Features**:
- In-process broadcasting without HTTP overhead
- Auto-reconnection and connection status indicators
- Real-time project status and sandbox updates
- Separate concerns for dashboard vs project pages

## Environment Variables

**Required Environment Variables**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Daytona & Claude
DAYTONA_API_KEY=your_daytona_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Code Quality Standards

**Current Status**: Production ready with zero ESLint warnings

**Optimizations Applied**:
- Removed all debug logging while preserving error logging
- Fixed React Hook dependencies and circular dependencies
- Implemented ref-based state management for performance
- Removed unused systems (SSE, legacy AI chat endpoints)
- Updated deprecated API usage and optimized imports