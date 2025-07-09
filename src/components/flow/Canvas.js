'use client';

import { useCallback } from 'react';
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

const nodeTypes = {
  baseNode: BaseNode,
  checklistNode: ChecklistNode,
  webserverNode: WebserverNode,
}

export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
