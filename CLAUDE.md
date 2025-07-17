# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev --turbopack` - Start development server with Turbopack (opens at http://localhost:3000)
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run Next.js linting

## Architecture Overview

This is a Next.js 15 application built with React 19 that implements a node-based visual interface using ReactFlow. The core concept revolves around different types of interactive nodes that can be arranged on a canvas.

### Key Components

**ReactFlow Canvas System (`src/components/flow/Canvas.js`)**:
- Main canvas component using ReactFlow library
- Manages node state, edge connections, and user interactions
- Supports multiple node types with custom implementations

**Node Architecture**:
- **BaseNode** (`src/components/nodes/basenode/`): Core reusable node component with hover controls, sizing options, and connection handles
- **ChecklistNode**: Task management nodes with interactive checklists
- **WebserverNode**: Displays live web content with iframe previews and error handling
- **AIChatNode**: Interactive AI chat interface nodes with real-time WebSocket communication and Claude Code CLI integration

**Node Management**:
- Nodes support multiple device sizes (desktop, tablet, mobile) with responsive layouts
- Built-in controls for duplication, deletion, and resizing
- Connection system via ReactFlow handles (top, bottom, left, right)

### Data Flow

- Initial node configurations defined in `src/data/nodes.js`
- Node types registered in Canvas component's `nodeTypes` object
- State management via ReactFlow's built-in hooks (`useNodesState`, `useEdgesState`)

### Integration Points

**Daytona Integration**: Uses `@daytonaio/sdk` for development environment integration, particularly visible in webserver node URLs

**Styling**: Tailwind CSS v4 for component styling with custom color constants in `src/constants/colors.js`

### Project Structure Notes

- App Router architecture with pages in `app/` directory
- Reusable UI components in `src/components/ui/`
- Project management features for organizing node-based workflows
- API routes for AI chat functionality (`app/api/ai-chat/route.js`) with streaming support and sandbox integration
- WebSocket server for real-time communication (`server.js`)

## Database Setup

### MongoDB Schema Design

**Projects Collection**:
```javascript
{
  _id: ObjectId,
  id: Number,                    // Unique sequential ID for frontend compatibility
  title: String,                 // Project title (required)
  description: String,           // Project description (required)
  color: String,                 // Project theme color (blue, purple, green, yellow, red, indigo, etc.)
  starred: Boolean,              // Whether project is starred/favorited
  progress: Number,              // Number of completed tasks
  totalTasks: Number,            // Total number of tasks in project
  updatedAt: String,             // Human-readable last update timestamp
  status: String,                // Project status: "on-track", "overdue", "completed", "paused"
  tags: [String],                // Array of project tags/categories
  team: [String],                // Array of team member initials/IDs
  sandboxId: String,             // Daytona sandbox ID for development environment integration
  sandboxStatus: String,         // Sandbox status: "creating", "created", "started", "stopped", "failed"
  sandboxError: String,          // Error message if sandbox creation/operation failed
  sections: [{                   // Project sections/phases
    name: String,                // Section name
    status: String               // Section status: "Not Started", "Concept", "In Progress", "Completed"
  }],
  createdAt: Date,               // MongoDB timestamp for creation
  updatedAtTimestamp: Date       // MongoDB timestamp for last update
}
```

### MongoDB Atlas Implementation

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Connection Details**:
- **Database**: MongoDB Atlas cloud database
- **Connection**: `src/lib/mongodb.js` - Mongoose connection with caching and Stable API v1
- **Environment**: `.env` file contains `MONGODB_URI`
- **Database Name**: `curio` (specified in connection string)

**Key Files Implemented**:
- `/src/lib/mongodb.js` - MongoDB connection utility with Mongoose
- `/src/models/Project.js` - Project schema with validation
- `/app/api/projects/route.js` - GET/POST endpoints for projects
- `/app/api/projects/[id]/route.js` - GET/PUT/DELETE for individual projects
- `/src/hooks/useProjects.js` - React hook for project CRUD operations
- `/src/components/project/ProjectCreateForm.js` - Project creation modal form

**Sandbox Management Files**:
- `/src/services/sandboxService.js` - Core Daytona SDK integration for sandbox operations
- `/src/services/backgroundJobs.js` - Background job queue for sandbox creation
- `/src/hooks/useSandboxTimeout.js` - React hook for managing sandbox inactivity timeouts
- `/app/api/projects/[id]/sandbox/` - API routes for sandbox management operations

**API Endpoints**:
- `GET /api/projects` - Fetch all projects (sorted by updatedAtTimestamp desc)
- `POST /api/projects` - Create new project (auto-generates sequential ID)
- `GET /api/projects/[id]` - Get specific project by ID
- `PUT /api/projects/[id]` - Update project (includes star toggle)
- `DELETE /api/projects/[id]` - Delete project

**Sandbox Management API Endpoints**:
- `POST /api/projects/[id]/sandbox/retry` - Retry sandbox creation for a project
- `POST /api/projects/[id]/sandbox/start` - Start an existing sandbox
- `GET /api/projects/[id]/sandbox/status` - Get sandbox status and preview URL
- `POST /api/projects/[id]/sandbox/stop` - Stop a running sandbox

**Dashboard Integration**:
- Projects are loaded from MongoDB Atlas via `/src/hooks/useProjects.js`
- Real-time updates: star toggles, project creation persist to database
- Loading states and error handling implemented
- "New Project" button opens `/src/components/project/ProjectCreateForm.js`

**MongoDB Atlas Setup Requirements**:
1. **Connection String Format**: `mongodb+srv://username:password@cluster.mongodb.net/curio?retryWrites=true&w=majority&appName=ClusterName`
3. **Network Access**: IP address must be whitelisted in MongoDB Atlas Network Access. Command for it is `curl -s ifconfig.me`
4. **Database User**: Must have "Read and write to any database" permissions
5. **Database Name**: Must be specified in connection string (e.g., `/curio`)

**Troubleshooting Notes**:
- "bad auth : authentication failed" usually means: wrong credentials, special chars not encoded, or IP not whitelisted
- Environment variables require server restart to take effect
- Use `curl -s ifconfig.me` to get current IP for whitelisting

**Data Flow**:
- Static `src/data/projects.js` has been removed
- All project data now flows through MongoDB Atlas
- UI components unchanged - only data source switched from static to API

## Sandbox Management System

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Overview**: Integrated Daytona SDK for creating and managing development sandbox environments directly from projects.

**Core Features**:
- **Sandbox Creation**: Automatically creates Next.js development environments using Daytona
- **Background Processing**: Sandbox creation runs asynchronously via background job queue
- **Lifecycle Management**: Start, stop, and monitor sandbox status
- **Inactivity Timeout**: Automatically stops sandboxes after 10 minutes of inactivity
- **Error Handling**: Robust error tracking with retry functionality

**Environment Requirements**:
- `DAYTONA_API_KEY` - Required environment variable for Daytona SDK authentication

**Sandbox Workflow**:
1. **Creation**: Project creation triggers background sandbox setup with Next.js template
2. **Status Tracking**: Projects track sandbox status (`creating`, `created`, `started`, `stopped`, `failed`)
3. **Preview URLs**: Live preview links generated when sandbox is running
4. **Auto-Stop**: Inactive sandboxes automatically stop after timeout to save resources

**Technical Implementation**:
- Sandbox operations use Daytona SDK with Node.js 20 base image
- Next.js projects created with TypeScript, Tailwind CSS, and ESLint
- Development server runs on port 3000 with auto-restart capabilities
- Background job queue prevents blocking UI during sandbox operations

## AI Chat System

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Overview**: Advanced real-time AI chat system with WebSocket communication and direct Claude Code CLI integration within Daytona sandboxes.

**Core Features**:
- **Real-time Communication**: WebSocket-based bidirectional messaging with auto-reconnection
- **Claude Code Integration**: Direct execution of Claude Code CLI within project sandboxes
- **Streaming Responses**: Server-sent events for live AI response updates
- **Rich Message Types**: Visual differentiation for user messages, AI responses, tool usage, system messages, and errors
- **Session Persistence**: Chat history maintained in localStorage per node
- **Project Context**: AI works directly within existing Next.js projects

**Technical Architecture**:
- **WebSocket Server** (`server.js`): Custom WebSocket server with session management and keepalive
- **WebSocket Hook** (`src/hooks/useClaudeWebSocket.js`): React hook for WebSocket connection management
- **AI Chat Node** (`src/components/nodes/aichat/index.js`): Enhanced UI with message persistence and rich formatting
- **API Route** (`app/api/ai-chat/route.js`): Streaming API with Claude CLI execution and sandbox integration

**Key Features**:
- **Connection Management**: Auto-reconnection with 3-second delay and connection status indicators
- **Message Processing**: Real-time parsing of Claude CLI JSON output for different message types
- **Sandbox Integration**: Validates project existence and executes AI within sandbox context
- **Error Handling**: Comprehensive error tracking with user-friendly messages
- **Tool Visualization**: Live display of AI tool usage and execution progress

**Environment Requirements**:
- `DAYTONA_API_KEY` - Required for sandbox integration
- WebSocket server runs on port 3001 alongside Next.js development server

**Message Types Supported**:
- User messages with timestamps
- AI responses with thinking indicators
- Tool usage notifications
- System messages (collapsible)
- Error messages with retry options
- Status updates and completion notifications

**Workflow**:
1. **Connection**: WebSocket establishes connection with auto-reconnection
2. **Message Sending**: User messages sent via WebSocket to server
3. **Validation**: Server validates project and sandbox accessibility
4. **AI Execution**: Claude Code CLI executed within sandbox context
5. **Streaming**: Real-time output streamed back to client
6. **Rendering**: Different message types rendered with appropriate UI

## Memories

- Memorizing to track development progress and key insights for the Curio project.
- Notes about the ability to memorize short textual insights about the project's development process