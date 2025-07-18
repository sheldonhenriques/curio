'use client';

import { useCallback, useEffect, useMemo } from 'react';
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
import { initialNodes } from '@/data/nodes.js'
import BaseNode from "@/components/nodes/basenode"
import ChecklistNode from "@/components/nodes/checklist"
import WebserverNode from "@/components/nodes/webserver"
import AIChatNode from "@/components/nodes/aichat"

const nodeTypes = {
  baseNode: BaseNode,
  checklistNode: ChecklistNode,
  webserverNode: WebserverNode,
  aichatNode: AIChatNode,
}

export default function Canvas({ project, previewUrl, sandboxStatus }) {
  // Create project-specific nodes with sandbox integration
  const projectNodes = useMemo(() => {
    if (!project) return initialNodes;
    
    return initialNodes.map(node => {
      // Update webserver nodes with the sandbox preview URL and status
      if (node.type === 'webserverNode') {
        return {
          ...node,
          data: {
            ...node.data,
            url: previewUrl || node.data.url,
            projectName: project.title,
            sandboxStatus: sandboxStatus,
            hasError: !previewUrl && (sandboxStatus === 'failed' || sandboxStatus === 'error')
          }
        };
      }
      // Update AI chat nodes with project context
      if (node.type === 'aichatNode') {
        return {
          ...node,
          data: {
            ...node.data,
            projectId: project.id,
            projectName: project.title,
            sandboxId: project.sandboxId,
            sandboxStatus: sandboxStatus
          }
        };
      }
      return node;
    });
  }, [project, previewUrl, sandboxStatus]);

  const [nodes, setNodes, onNodesChange] = useNodesState(projectNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes when project or previewUrl changes
  useEffect(() => {
    setNodes(projectNodes);
  }, [projectNodes, setNodes]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
    </div>
  );
}
