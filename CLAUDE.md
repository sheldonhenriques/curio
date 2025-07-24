# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with integrated WebSocket (opens at http://localhost:3000)
- `npm run build` - Build the application for production
- `npm run start` - Start the production server with WebSocket integration
- `npm run lint` - Run Next.js linting

**Note**: The development server now uses a custom `server.js` that integrates both the Next.js app and WebSocket server on a single port for AI chat functionality.

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

### Database Migration History

The application was successfully migrated from Supabase to MongoDB Atlas for better flexibility and integration with the existing codebase. The migration involved:

- **Authentication System**: Migrated to Supabase Auth with middleware-based session management
- **Project Data**: Migrated from MongoDB to structured MongoDB collections with improved schema design
- **Chat Sessions**: Added persistent chat session storage with MongoDB integration
- **User Management**: Implemented Supabase-based user authentication with secure server-side components

All legacy code and temporary migration files have been cleaned up, leaving a clean, production-ready codebase.

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
- `DELETE /api/projects/[id]` - Delete project and associated sandbox

**Sandbox Management API Endpoints**:
- `POST /api/projects/[id]/sandbox/retry` - Retry sandbox creation for a project
- `POST /api/projects/[id]/sandbox/start` - Start an existing sandbox
- `GET /api/projects/[id]/sandbox/status` - Get sandbox status and preview URL
- `POST /api/projects/[id]/sandbox/stop` - Stop a running sandbox
- `POST /api/projects/[id]/sandbox/inject-ids` - Inject unique AST-based IDs into JSX/TSX files

**Dashboard Integration**:
- Projects are loaded from MongoDB Atlas via `/src/hooks/useProjects.js`
- Real-time updates: star toggles, project creation persist to database
- Loading states and error handling implemented
- "New Project" button opens `/src/components/project/ProjectCreateForm.js`
- Project deletion with confirmation dialog and sandbox cleanup

**Project Deletion System**:
- **Complete Removal**: Deletes both MongoDB project record and associated Daytona sandbox
- **UI Integration**: Dropdown menu in project cards with trash icon and confirmation dialog
- **Optimistic Updates**: Projects immediately removed from UI with rollback on failure
- **Graceful Error Handling**: Project deletion continues even if sandbox cleanup fails
- **Key Files**: `useProjects.js` hook, `ProjectCard.js` dropdown, dashboard confirmation dialog

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
- Automatic AST-based ID injection for visual editor compatibility

**Enhanced Sandbox Setup Process**:
1. **Next.js Project Creation**: Standard create-next-app with TypeScript and Tailwind
2. **Claude Code SDK Installation**: Global installation for AI chat functionality  
3. **Visual Editor SDK Injection**: Automatic integration for visual editing capabilities
4. **AST Dependencies**: Installation of Babel parsing libraries for code manipulation
5. **ID Injection**: Automatic injection of `data-visual-id` attributes into all JSX/TSX files
6. **Development Server**: Start with enhanced capabilities for visual editing

## AST-Based Element ID Injection System

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Overview**: Advanced system that automatically injects unique `data-visual-id` attributes into all JSX/TSX elements in Next.js projects to enable precise visual editor targeting and DOM manipulation.

**Core Features**:
- **Automatic ID Generation**: Unique IDs generated per component using pattern `ComponentName_ElementType_Index`
- **AST-Based Processing**: Uses Babel parser for safe JSX/TSX manipulation without breaking code syntax
- **Batch Processing**: Processes entire project directories recursively with smart filtering
- **Sandbox Integration**: Executes directly within Daytona sandboxes during project creation
- **On-Demand API**: REST endpoint for manual ID injection when needed

**Technical Architecture**:
- **AST Injector Class** (`src/services/astIdInjector.js`): Core logic for parsing and injecting IDs using Babel AST
- **Standalone Script** (`src/services/ast-injector.js`): CLI version for command-line execution within sandboxes
- **API Endpoint** (`app/api/projects/[id]/sandbox/inject-ids/route.js`): REST API for on-demand injection
- **Sandbox Integration**: Automatic injection during sandbox creation in `sandboxService.js`

**ID Generation Strategy**:
- **Component Name**: Extracted from filename (e.g., `UserProfile.jsx` → `UserProfile`)
- **Element Type**: JSX element name (e.g., `div`, `button`, `UserCard`)
- **Index**: Sequential counter per component (0, 1, 2, ...)
- **Final Format**: `UserProfile_div_0`, `UserProfile_button_1`, `UserProfile_UserCard_2`

**Advanced Features**:
- **Duplicate Prevention**: Skips elements that already have `data-visual-id` attributes
- **TypeScript Support**: Full support for both JSX and TSX files with proper parsing
- **Fragment Handling**: Special handling for React fragments and complex JSX structures
- **Directory Traversal**: Automatically skips `node_modules`, `.next`, and `.git` directories
- **Error Recovery**: Continues processing other files if individual files fail to parse
- **Dependency Management**: Auto-installs Babel dependencies in sandbox if missing

**Integration Points**:
- **Sandbox Creation**: IDs automatically injected when creating new Next.js projects
- **Visual Editor**: IDs enable precise element targeting for the visual website editor
- **Property Panel**: Selected elements identified by these unique IDs for property manipulation
- **Cross-frame Communication**: IDs used for PostMessage communication between iframe and parent

**Workflow**:
1. **Project Creation**: AST ID injection triggered during sandbox setup
2. **File Discovery**: Recursively finds all JSX/TSX files in project directory
3. **AST Parsing**: Each file parsed using Babel parser with JSX plugin
4. **ID Injection**: Unique `data-visual-id` attributes added to all JSX elements
5. **Code Generation**: Modified AST converted back to source code
6. **File Writing**: Updated files written back to sandbox filesystem
7. **Dependency Installation**: Babel packages installed if not present

**Environment Integration**:
- **Automatic Setup**: IDs injected during every new sandbox creation
- **Zero Configuration**: No manual setup required - works automatically
- **Safe Processing**: AST manipulation ensures code syntax remains valid
- **Performance Optimized**: Efficient batch processing with minimal overhead

**Dependencies**:
- `@babel/parser` - JavaScript/JSX/TSX parsing
- `@babel/traverse` - AST traversal and manipulation
- `@babel/types` - AST node type definitions
- `@babel/generator` - AST to source code conversion

## AI Chat System

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Overview**: Advanced real-time AI chat system with WebSocket communication, direct Claude Code CLI integration within Daytona sandboxes, and persistent chat session management.

**Core Features**:
- **Real-time Communication**: WebSocket-based bidirectional messaging with auto-reconnection
- **Claude Code Integration**: Direct execution of Claude Code CLI within project sandboxes with conversation continuity
- **Streaming Responses**: Real-time parsing of Claude CLI JSON output with JSON buffering for complete message handling
- **Rich Message Types**: Visual differentiation for user messages, AI responses, tool usage, system messages, thinking states, and errors
- **Session Persistence**: MongoDB-backed chat session storage with message history per node
- **Project Context**: AI works directly within existing Next.js projects with enhanced project awareness
- **Session Continuity**: Claude CLI session IDs maintained across conversations for context preservation

**Technical Architecture**:
- **WebSocket Server** (`server.js`): Custom WebSocket server with session management, JSON buffering, and Claude CLI streaming
- **WebSocket Hook** (`src/hooks/useClaudeWebSocket.js`): React hook for WebSocket connection management with auto-reconnection
- **Chat Session Hook** (`src/hooks/useChatSession.js`): MongoDB-backed session persistence and message management
- **AI Chat Node** (`src/components/nodes/aichat/index.js`): Enhanced UI with message bubbles, session indicators, and rich formatting
- **Chat Session Model** (`src/models/ChatSession.js`): MongoDB schema for persistent chat sessions with message history
- **Session API Routes** (`app/api/chat-sessions/`): RESTful endpoints for session CRUD operations

**Advanced Features**:
- **Connection Management**: Auto-reconnection with 3-second delay and visual connection status indicators
- **Message Processing**: Real-time parsing of Claude CLI streaming JSON output with complete message buffering
- **Sandbox Integration**: Validates project existence and executes AI within sandbox context with directory awareness
- **Error Handling**: Comprehensive error tracking with user-friendly messages and retry mechanisms
- **Tool Visualization**: Live display of AI tool usage with file path information and execution progress
- **Session Management**: Database-backed session persistence with cleanup and message history
- **Claude CLI Integration**: Direct execution with session ID continuity, enhanced context prompts, and tool restrictions

**Environment Requirements**:
- `DAYTONA_API_KEY` - Required for sandbox integration
- `ANTHROPIC_API_KEY` - Required for Claude CLI execution
- `MONGODB_URI` - Required for session persistence
- WebSocket server integrated with Next.js server (single port deployment)

**Message Types Supported**:
- **User Messages**: Timestamped user input with blue styling
- **Claude Responses**: AI responses with assistant styling and timestamps  
- **Tool Usage**: Green bubbles showing tool execution with file paths
- **System Messages**: Collapsible gray bubbles with raw JSON data
- **Thinking States**: Loading indicators during AI processing
- **Error Messages**: Red error bubbles with retry options
- **Status/Completion**: Blue/green status updates and completion notifications

**Database Schema**:
- **ChatSessions Collection**: Stores session metadata, node/project associations, and message arrays
- **Message Embedding**: Individual messages stored with type, content, timestamp, and metadata
- **Automatic Cleanup**: Background cleanup of sessions older than 5 hours
- **Indexing**: Optimized queries with compound indexes on nodeId/isActive and createdAt

**Enhanced Workflow**:
1. **Session Loading**: Check for existing MongoDB session on node initialization
2. **WebSocket Connection**: Establish connection with auto-reconnection and status tracking
3. **Message Sending**: User messages saved to database and sent via WebSocket
4. **Claude Execution**: Enhanced prompts with project context, directory awareness, and tool restrictions
5. **Session Continuity**: Claude CLI session IDs preserved across conversations for context
6. **Real-time Streaming**: JSON-buffered output parsing with complete message handling
7. **Message Persistence**: All messages automatically saved to MongoDB for session history
8. **UI Rendering**: Rich message bubbles with type-specific styling and interaction features

**Dependencies Added**:
- `ws: ^8.18.3` - WebSocket server implementation
- `uuid: ^11.1.0` - Session ID generation

## Authentication System

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Overview**: Secure authentication system using Supabase Auth with middleware-based session management and server-side component integration.

**Core Features**:
- **Supabase Integration**: Full integration with Supabase Auth for user management
- **Middleware Protection**: Route-level authentication with automatic redirects
- **Server-side Components**: Secure server-side user data access
- **Session Management**: Persistent user sessions with automatic refresh
- **Login/Logout Flow**: Complete authentication flow with error handling

**Technical Architecture**:
- **Supabase Client** (`src/utils/supabase/client.js`): Browser-side Supabase client for authentication
- **Supabase Server** (`src/utils/supabase/server.js`): Server-side Supabase client for secure operations
- **Middleware** (`middleware.js`): Route protection and authentication verification
- **Auth Hook** (`src/hooks/useAuth.js`): React hook for authentication state management
- **Login Page** (`app/login/page.js`): Authentication interface with GitHub OAuth
- **Auth Components** (`src/components/auth/`): Login form and logout button components

**Authentication Flow**:
1. **Route Protection**: Middleware checks authentication status for protected routes
2. **Login Process**: Users authenticate via GitHub OAuth through Supabase
3. **Session Creation**: Supabase creates secure session cookies
4. **Server Validation**: Server-side components validate sessions for secure operations
5. **Auto Refresh**: Sessions automatically refresh to maintain authentication
6. **Logout Process**: Secure logout with session cleanup

**Environment Requirements**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

**Key Files**:
- `/middleware.js` - Route protection and authentication middleware
- `/app/login/page.js` - Authentication page with GitHub OAuth
- `/app/auth/callback/route.js` - OAuth callback handler
- `/src/components/auth/LoginForm.js` - Login interface component
- `/src/components/auth/LogoutButton.js` - Logout functionality
- `/src/hooks/useAuth.js` - Authentication state management
- `/src/utils/supabase/` - Supabase client utilities

**Protected Routes**:
- `/dashboard` - Main application dashboard (requires authentication)
- `/projects/*` - All project-related pages (requires authentication)
- API routes automatically protected via middleware

**Security Features**:
- **Row Level Security**: Database-level security policies
- **Session Validation**: Server-side session verification
- **CSRF Protection**: Built-in CSRF protection via Supabase
- **Secure Cookies**: HTTP-only cookies for session management
- **Auto Logout**: Automatic logout on session expiration

## Visual Website Editor System

**Current Status**: ✅ **IMPLEMENTED AND WORKING**

**Overview**: Advanced visual editor that allows users to select DOM elements directly in webserver previews and modify their Tailwind CSS properties in real-time, similar to V0 or Webflow.

**Core Features**:
- **Visual Element Selection**: Click to select DOM elements with real-time border highlighting and hover effects
- **Property Panel**: Sliding sidebar with organized Tailwind CSS property controls for selected elements
- **Real-time Updates**: Changes applied immediately to both iframe preview and source files in sandbox
- **Tailwind Integration**: Smart class replacement with conflict resolution and arbitrary value support
- **Cross-origin Communication**: PostMessage API for seamless iframe-parent communication
- **Auto SDK Integration**: Visual Editor SDK automatically included in Next.js sandbox projects
- **AST-Based Targeting**: Uses unique `data-visual-id` attributes for precise element identification

**Technical Architecture**:
- **Visual Editor SDK** (`src/services/visual-editor-sdk.js`): Client-side script injected into Next.js projects for element selection and manipulation
- **Property Panel** (`src/components/nodes/webserver/PropertyPanel.js`): React component with organized Tailwind property controls
- **Webserver Node Enhancements** (`src/components/nodes/webserver/`): Enhanced webserver nodes with select mode toggle and property panel integration
- **File Modification API** (`app/api/projects/[id]/sandbox/files/modify/route.js`): Backend API for updating JSX/TSX files with new className attributes
- **Sandbox Integration** (`src/services/sandboxService.js`): Automatic Visual Editor SDK injection during Next.js project creation

**Advanced Features**:
- **Element Highlighting**: Visual borders and overlays for hover and selection states with smooth transitions
- **Smart Class Management**: Automatic detection and removal of conflicting Tailwind classes when applying new ones
- **Property Categories**: Organized controls for Layout, Typography, Background & Borders, Content, and Advanced properties
- **Arbitrary Values**: Support for custom Tailwind arbitrary values like `m-[23px]`, `bg-[#1da1f2]`, `text-[17px]`
- **Element Path Tracking**: CSS selector generation for precise element targeting across DOM hierarchy
- **Live Preview**: Immediate visual feedback without page refresh or file save delays

**Property Panel Sections**:
- **Layout**: Margin, padding, width, height, display, position with Tailwind spacing scale
- **Typography**: Font size, weight, color, text alignment with Tailwind typography controls
- **Background & Borders**: Background colors, border radius, border properties using Tailwind color palette
- **Content**: Text content modification for text elements, direct inline editing
- **Advanced**: Opacity, z-index, transform, overflow properties

**Communication Flow**:
1. **Select Mode Activation**: Toggle button in webserver header activates element selection mode
2. **PostMessage Communication**: Bidirectional messaging between parent window and iframe using `*` origin for cross-domain compatibility
3. **Element Detection**: Visual Editor SDK adds event listeners for mouseover, mouseout, and click events
4. **Property Extraction**: Selected elements analyzed for computed styles, Tailwind classes, and metadata
5. **Property Panel Display**: Element properties shown in organized sections with appropriate Tailwind controls
6. **Real-time Updates**: Property changes immediately applied to DOM and persisted to source files via API
7. **File Persistence**: JSX/TSX files updated with new className attributes through sandbox file modification API

**Tailwind CSS Integration**:
- **Class Replacement Strategy**: Replace conflicting Tailwind classes rather than adding duplicates
- **Conflict Detection**: Automatic detection of conflicting patterns (e.g., `m-4` conflicts with `m-6`)
- **Arbitrary Value Support**: Full support for Tailwind's arbitrary value syntax with square bracket notation
- **Property Mapping**: Intelligent conversion of CSS properties to appropriate Tailwind class names

**File Modification System**:
- **JSX/TSX Parsing**: Simple regex-based className attribute updates for immediate functionality
- **Sandbox Integration**: Uses existing Daytona SDK for secure file operations within development environments
- **Multiple File Support**: Automatic detection and modification of React component files
- **Error Handling**: Comprehensive error tracking for file read/write operations

**Environment Integration**:
- **Automatic SDK Injection**: Visual Editor SDK automatically added to Next.js projects during sandbox creation
- **Layout Integration**: SDK script included in root layout.tsx for global availability
- **No Manual Setup**: Zero-configuration installation - SDK included automatically in new sandboxes

**User Experience Enhancements**:
- **Smooth Animations**: CSS transitions for highlight overlays and property panel sliding
- **Visual Feedback**: Clear visual indicators for hover, selection, and active states
- **Keyboard Support**: Escape key to deactivate select mode and close property panels
- **Responsive Design**: Property panel adapts to different screen sizes and node dimensions
- **Error Recovery**: Graceful handling of communication failures and DOM manipulation errors

**Technical Implementation Details**:
- **Cross-origin Messaging**: PostMessage API with wildcard origin for maximum compatibility
- **DOM Traversal**: Efficient element path generation using CSS selectors and element hierarchy
- **Style Computation**: Real-time extraction of computed styles and Tailwind class detection
- **Memory Management**: Proper cleanup of event listeners and overlay elements
- **Performance Optimization**: Debounced event handlers and efficient DOM manipulation

**API Endpoints**:
- `POST /api/projects/[id]/sandbox/files/modify` - Update JSX/TSX files with new className attributes
- `GET /api/projects/[id]/sandbox/files/modify?path=<path>` - List JSX/TSX files in sandbox for modification
- `POST /api/projects/[id]/sandbox/inject-ids` - Inject unique AST-based IDs into JSX/TSX files for element targeting

**Dependencies**:
- Existing Daytona SDK for sandbox file operations
- PostMessage API for iframe communication
- Tailwind CSS for styling system integration
- React/Next.js component architecture

## Code Quality & Maintenance

**Current Status**: ✅ **PRODUCTION READY**

**Overview**: The codebase has been cleaned and optimized for production use with proper error handling and logging standards.

**Code Quality Standards**:
- **Clean Logging**: All debug console.log statements removed from production code
- **Error Handling**: Comprehensive error logging maintained for debugging production issues
- **Type Safety**: Full TypeScript integration with proper type definitions
- **Linting**: ESLint configuration with Next.js best practices
- **Performance**: Optimized React hooks and database queries

**Maintenance Notes**:
- **Database**: MongoDB Atlas with proper indexing and connection pooling
- **Authentication**: Supabase Auth with secure session management
- **API Routes**: RESTful API design with proper error responses
- **WebSocket**: Real-time communication with reconnection logic
- **File Structure**: Clean separation of concerns with organized component architecture

**Development Standards**:
- **Component Structure**: Reusable components with proper prop validation
- **State Management**: React hooks for local state, MongoDB for persistence  
- **Error Boundaries**: Graceful error handling throughout the application
- **Security**: Protected routes, input validation, and secure API endpoints
- **Testing**: Ready for test implementation with clean, testable code structure

## Memories

- Successfully migrated from Supabase database to MongoDB Atlas while maintaining Supabase Auth
- Implemented comprehensive visual website editor with Tailwind CSS integration
- Built robust AI chat system with Claude Code CLI integration and WebSocket communication
- Cleaned up all debug logging for production readiness
- Established secure authentication flow with middleware-based route protection