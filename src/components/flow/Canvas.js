'use client';

import { useCallback, useEffect, useMemo, useState, createContext, useContext, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from 'reactflow';

import 'reactflow/dist/style.css';
import BaseNode from "@/components/nodes/basenode"
import ChecklistNode from "@/components/nodes/checklist"
import WebserverNode from "@/components/nodes/webserver"
import AIChatNode from "@/components/nodes/aichat"
import FloatingPropertyPanel from "@/components/flow/FloatingPropertyPanel"
import { useProjectNodes } from '@/hooks/useProjectNodes'
import { useAuth } from '@/hooks/useAuth'
import { useNodeCreationSocket } from '@/hooks/useNodeCreationSocket'

// Create context for property panel state
const PropertyPanelContext = createContext()

// Custom hook to use property panel context
export const usePropertyPanel = () => {
  const context = useContext(PropertyPanelContext)
  if (!context) {
    throw new Error('usePropertyPanel must be used within PropertyPanelProvider')
  }
  return context
}

const nodeTypes = {
  baseNode: BaseNode,
  checklistNode: ChecklistNode,
  webserverNode: WebserverNode,
  aichatNode: AIChatNode,
}

export default function Canvas({ project, previewUrl, sandboxStatus }) {
  // Property panel state
  const [selectedElement, setSelectedElement] = useState(null)
  const [updateElementFunction, setUpdateElementFunction] = useState(null)

  // Get current user for database operations
  const { user } = useAuth();

  // Use database-backed nodes with fallback to static nodes
  const {
    nodes: dbNodes,
    loading: nodesLoading,
    error: nodesError,
    createNode,
    updateNode,
    deleteNode,
    createDefaultAIChatNode,
    ensureAIChatNode
  } = useProjectNodes(project?.id, user?.id);


  // Create project-specific nodes with sandbox integration and local storage positions
  const projectNodes = useMemo(() => {
    if (!project || nodesLoading) {
      return [];
    }

    // If there's an error loading nodes, return empty array
    if (nodesError) {
      console.error('Error loading nodes:', nodesError);
      return [];
    }

    // Use database nodes and update them with current project context
    return dbNodes.map(node => {
      // Removed local storage functionality - positions are now stored in database
      
      let updatedNode = { ...node };

      // Update webserver nodes with the sandbox preview URL and status
      if (node.type === 'webserverNode') {
        // Construct the full URL by combining the base preview URL with the node's route
        let fullUrl = updatedNode.data.url; // Keep existing URL as fallback
        
        if (previewUrl && updatedNode.data.route) {
          try {
            const baseUrl = new URL(previewUrl);
            const route = updatedNode.data.route.startsWith('/') ? updatedNode.data.route : `/${updatedNode.data.route}`;
            fullUrl = `${baseUrl.protocol}//${baseUrl.host}${route}`;
          } catch {
            // If URL construction fails, fall back to just the preview URL
            fullUrl = previewUrl;
          }
        } else if (previewUrl) {
          fullUrl = previewUrl;
        }
        
        return {
          ...updatedNode,
          data: {
            ...updatedNode.data,
            url: fullUrl,
            projectName: project.title,
            sandboxStatus: sandboxStatus,
            hasError: !previewUrl && (sandboxStatus === 'failed' || sandboxStatus === 'error')
          }
        };
      }
      // Update AI chat nodes with project context
      if (node.type === 'aichatNode') {
        return {
          ...updatedNode,
          data: {
            ...updatedNode.data,
            projectId: project.id,
            projectName: project.title,
            sandboxId: project.sandboxId,
            sandboxStatus: sandboxStatus
          }
        };
      }
      return updatedNode;
    });
  }, [project, previewUrl, sandboxStatus, dbNodes, nodesLoading, nodesError]);

  const [nodes, setNodes, defaultOnNodesChange] = useNodesState(projectNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Custom onNodesChange handler (no webhook calls here)
  const onNodesChange = useCallback((changes) => {
    // Apply changes immediately for UI responsiveness
    defaultOnNodesChange(changes);
  }, [defaultOnNodesChange]);

  // Update nodes when project data changes (but preserve local positions)
  useEffect(() => {
    setNodes(currentNodes => {
      // Only update if the structure has actually changed
      if (currentNodes.length !== projectNodes.length) {
        return projectNodes;
      }
      
      // Check if any node IDs or types have changed
      const hasStructuralChanges = projectNodes.some((newNode, index) => {
        const currentNode = currentNodes[index];
        return !currentNode || currentNode.id !== newNode.id || currentNode.type !== newNode.type;
      });
      
      if (hasStructuralChanges) {
        return projectNodes;
      }
      
      // Only update non-position/style data (like webserver URLs, AI chat project context)
      return currentNodes.map(currentNode => {
        const newNode = projectNodes.find(n => n.id === currentNode.id);
        if (newNode) {
          return {
            ...currentNode,
            data: newNode.data, // Update project context data
            // Keep existing position and style from current state
          };
        }
        return currentNode;
      });
    });
  }, [projectNodes, setNodes]);

  // Ensure AI chat node always exists - use ref to prevent multiple calls
  const hasCheckedAIChatRef = useRef(false);
  useEffect(() => {
    if (project && user && !nodesLoading && !nodesError && !hasCheckedAIChatRef.current) {
      hasCheckedAIChatRef.current = true;
      ensureAIChatNode(project);
    }
  }, [project, user, dbNodes, nodesLoading, nodesError, ensureAIChatNode]);

  // Handle sandbox status changes - refresh webserver nodes when sandbox becomes ready
  const previousSandboxStatusRef = useRef(sandboxStatus);
  useEffect(() => {
    const previousStatus = previousSandboxStatusRef.current;
    previousSandboxStatusRef.current = sandboxStatus;
    
    // If sandbox just became ready, force refresh all webserver nodes
    if (previousStatus !== 'started' && sandboxStatus === 'started' && previewUrl) {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          if (node.type === 'webserverNode') {
            // Reset error states and force iframe refresh by updating URL timestamp
            const currentUrl = node.data.url || previewUrl;
            const hasTimestamp = currentUrl.includes('?t=') || currentUrl.includes('&t=');
            const separator = currentUrl.includes('?') ? '&' : '?';
            const refreshUrl = hasTimestamp 
              ? currentUrl.replace(/[?&]t=\d+/, `${separator}t=${Date.now()}`)
              : `${currentUrl}${separator}t=${Date.now()}`;
            
            return {
              ...node,
              data: {
                ...node.data,
                url: refreshUrl,
                sandboxStatus: sandboxStatus,
                hasError: false
              }
            };
          }
          return node;
        })
      );
    }
  }, [sandboxStatus, previewUrl, setNodes]);

  // Handle real-time node creation via WebSocket
  const handleNodeCreated = useCallback((newNode) => {
    console.log('📡 Adding new node from WebSocket:', newNode);
    setNodes(prevNodes => {
      // Check if node already exists to prevent duplicates
      const exists = prevNodes.some(node => node.id === newNode.id);
      if (exists) {
        console.log('🔄 Node already exists, skipping:', newNode.id);
        return prevNodes;
      }
      return [...prevNodes, newNode];
    });
  }, [setNodes]);

  // Set up WebSocket listener for real-time node creation
  useNodeCreationSocket(project?.id, handleNodeCreated);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node drag stop - send webhook for position updates only when dragging ends
  const onNodeDragStop = useCallback((event, node) => {
    if (project?.id && user?.id && node?.id && node?.position) {
      // Send webhook for position updates only on drag end
      fetch('/api/webhook/node-position-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.id,
          projectId: project.id,
          position: node.position,
          userId: user.id
        }),
        credentials: 'include'
      }).catch(error => {
        console.error('Error sending position update webhook:', error);
      });
    }
  }, [project?.id, user?.id]);

  // Debounce timeout ref for text content updates
  const textContentTimeoutRef = useRef(null)
  
  // Refs to avoid stale closures
  const selectedElementRef = useRef(selectedElement)
  const projectRef = useRef(project) 
  const updateElementFunctionRef = useRef(updateElementFunction)
  
  // Update refs when values change
  useEffect(() => {
    selectedElementRef.current = selectedElement
    projectRef.current = project
    updateElementFunctionRef.current = updateElementFunction
  }, [selectedElement, project, updateElementFunction])

  // Debounced handler for text content updates
  const debouncedTextContentUpdate = useCallback(async (property, value) => {
    const element = selectedElementRef.current
    const proj = projectRef.current
    const updateFunc = updateElementFunctionRef.current
    
    if (!element || !value) return
    
    // Clear existing timeout
    if (textContentTimeoutRef.current) {
      clearTimeout(textContentTimeoutRef.current)
    }
    
    // Send immediate visual update to iframe
    if (updateFunc) {
      updateFunc(property, value, element.visualId)
    }
    
    // Debounce the file update (wait 800ms after user stops typing)
    textContentTimeoutRef.current = setTimeout(async () => {
      if (proj?.sandboxId) {
        
        try {
          const response = await fetch(`/api/projects/${proj.id}/sandbox/files/modify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              visualId: element.visualId,
              elementSelector: element.elementPath,
              xpath: element.xpath,
              property,
              value
            }),
            credentials: 'include'
          })
          
          const result = await response.json()
          if (!result.success) {
            console.error('Failed to update text content:', result.error)
            // Don't show alert for debounced updates to avoid interrupting user
          }
        } catch (error) {
          console.error('Error updating text content (debounced):', error)
        }
      }
    }, 400) // 400ms debounce delay
  }, [])

  // Helper function to convert property values to Tailwind classes
  const convertPropertyToTailwind = useCallback((property, value) => {
    if (!value) return ''
    
    // If the value is already a Tailwind class, return it
    if (value.includes('-') && (value.startsWith('m-') || value.startsWith('p-') || value.startsWith('text-') || 
        value.startsWith('bg-') || value.startsWith('font-') || value.startsWith('border-') || 
        value.startsWith('rounded-') || value === 'hidden' || value === 'block' || value === 'flex' || 
        value === 'grid' || value === 'inline')) {
      return value
    }
    
    switch (property) {
      case 'margin':
        return value ? `m-${value}` : ''
      case 'padding':
        return value ? `p-${value}` : ''
      case 'fontSize':
        return value.startsWith('text-') ? value : `text-${value}`
      case 'fontWeight':
        return value.startsWith('font-') ? value : `font-${value}`
      case 'textColor':
        return value.startsWith('text-') ? value : `text-${value}`
      case 'backgroundColor':
        return value.startsWith('bg-') ? value : `bg-${value}`
      case 'textAlign':
        return value.startsWith('text-') ? value : `text-${value}`
      case 'borderRadius':
        return value.startsWith('rounded') ? value : `rounded-${value}`
      case 'display':
        return value // display values are usually direct (block, flex, etc.)
      default:
        return value
    }
  }, [])

  const handlePropertyChange = useCallback(async (property, value) => {
    const element = selectedElementRef.current  
    const proj = projectRef.current
    const updateFunc = updateElementFunctionRef.current
    
    if (!element || !value) return
    
    // Handle textContent differently from CSS properties
    if (property === 'textContent') {
      // Use debounced handler for text content
      debouncedTextContentUpdate(property, value)
      return
    }
    
    // Handle CSS property changes
    const tailwindClass = convertPropertyToTailwind(property, value)
    
    // Send property change to iframe for immediate visual update
    if (updateFunc) {
      updateFunc(property, tailwindClass, element.visualId)
    }
    
    // Update files in sandbox
    if (proj?.sandboxId) {
      
      try {
        const response = await fetch(`/api/projects/${proj.id}/sandbox/files/modify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visualId: element.visualId,
            elementSelector: element.elementPath, // Keep as fallback
            xpath: element.xpath, // Add XPath for precise targeting
            newClassName: tailwindClass,
            property,
            value
          }),
          credentials: 'include'
        })

        const result = await response.json()
        if (!result.success) {
          console.error('Failed to update file:', result.error)
          if (result.sandboxStatus && result.sandboxStatus !== 'started') {
            alert(`File update failed: Sandbox is not running (${result.sandboxStatus}). Please start the sandbox from the project dashboard.`)
          } else {
            alert(`Failed to update file: ${result.error}`)
          }
        }
      } catch (error) {
        console.error('Error updating file:', error)
        alert(`Error updating file: ${error.message}`)
      }
    }
  }, [convertPropertyToTailwind, debouncedTextContentUpdate])

  const handlePropertyPanelClose = useCallback(() => {
    setSelectedElement(null)
  }, [])


  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      if (textContentTimeoutRef.current) {
        clearTimeout(textContentTimeoutRef.current)
      }
    }
  }, [])

  // Function to handle node data updates (for checklist items, webserver URLs, etc.)
  const handleNodeDataUpdate = useCallback((nodeId, newData, immediate = false) => {
    if (!project || !user || !updateNode) return;

    // Update local state immediately
    setNodes(nodes => nodes.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
    ));

    // Persist to database
    updateNode(nodeId, { data: newData }, immediate);
  }, [project, user, updateNode, setNodes]);

  // Context value for property panel and node components
  const propertyPanelValue = {
    selectedElement,
    setSelectedElement,
    updateElementFunction,
    setUpdateElementFunction,
    handlePropertyChange,
    handleNodeDataUpdate // Add this for node components to use
  }

  return (
    <PropertyPanelContext.Provider value={propertyPanelValue}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          fitView
          nodeTypes={nodeTypes}
          attributionPosition="bottom-left"
          selectNodesOnDrag={false}
          panOnDrag={[1, 2]}
          selectionOnDrag={true}
          minZoom={0.1}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <MiniMap />
        </ReactFlow>
        
        <FloatingPropertyPanel
          element={selectedElement}
          isVisible={!!selectedElement}
          onClose={handlePropertyPanelClose}
          onPropertyChange={handlePropertyChange}
        />
      </div>
    </PropertyPanelContext.Provider>
  );
}
