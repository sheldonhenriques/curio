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