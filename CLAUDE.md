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
- **AIChatNode**: Interactive AI chat interface nodes

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
- API routes for AI chat functionality (`app/api/ai-chat/route.js`)

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
- **Environment**: `.env` file contains `MONGODB_URI` and `MONGODB_DB_NAME`
- **Database Name**: `curio` (specified in connection string)

**Key Files Implemented**:
- `/src/lib/mongodb.js` - MongoDB connection utility with Mongoose
- `/src/models/Project.js` - Project schema with validation
- `/app/api/projects/route.js` - GET/POST endpoints for projects
- `/app/api/projects/[id]/route.js` - GET/PUT/DELETE for individual projects
- `/src/hooks/useProjects.js` - React hook for project CRUD operations
- `/src/components/project/ProjectCreateForm.js` - Project creation modal form

**API Endpoints**:
- `GET /api/projects` - Fetch all projects (sorted by updatedAtTimestamp desc)
- `POST /api/projects` - Create new project (auto-generates sequential ID)
- `GET /api/projects/[id]` - Get specific project by ID
- `PUT /api/projects/[id]` - Update project (includes star toggle)
- `DELETE /api/projects/[id]` - Delete project

**Dashboard Integration**:
- Projects are loaded from MongoDB Atlas via `/src/hooks/useProjects.js`
- Real-time updates: star toggles, project creation persist to database
- Loading states and error handling implemented
- "New Project" button opens `/src/components/project/ProjectCreateForm.js`

**MongoDB Atlas Setup Requirements**:
1. **Connection String Format**: `mongodb+srv://username:password@cluster.mongodb.net/curio?retryWrites=true&w=majority&appName=ClusterName`
2. **Special Characters**: Password special characters must be URL encoded (e.g., `$` becomes `%24`)
3. **Network Access**: IP address must be whitelisted in MongoDB Atlas Network Access
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