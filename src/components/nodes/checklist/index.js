"use client"

import { useState, useCallback } from "react"
import { useReactFlow } from "reactflow"
import { CHECKLIST_SIZES } from "@/constants/node"
import BaseNode from "@/components/nodes/basenode"
import ChecklistHeader from "@/components/nodes/checklist/ChecklistHeader"
import ChecklistBody from "@/components/nodes/checklist/ChecklistBody"
import AddItemInput from "@/components/nodes/checklist/AddItemInput"

export default function ChecklistNode({ id, data, selected }) {
  const [newItemText, setNewItemText] = useState("")
  const { setNodes } = useReactFlow()

  const checklistItems = data.checklistItems || []
  const currentDeviceType = data.deviceType || "normal"

  // Calculate progress
  const completedCount = checklistItems.filter((item) => item.completed).length
  const totalCount = checklistItems.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleTitleChange = useCallback(
    (newTitle) => {
      setNodes((nodes) =>
        nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, label: newTitle } } : node)),
      )
    },
    [id, setNodes],
  )

  const handleToggleItem = useCallback(
    (itemId) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  checklistItems: node.data.checklistItems.map((item) =>
                    item.id === itemId ? { ...item, completed: !item.completed } : item,
                  ),
                },
              }
            : node,
        ),
      )
    },
    [id, setNodes],
  )

  const handleDeleteItem = useCallback(
    (itemId) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  checklistItems: node.data.checklistItems.filter((item) => item.id !== itemId),
                },
              }
            : node,
        ),
      )
    },
    [id, setNodes],
  )

  const handleAddItem = useCallback(() => {
    if (!newItemText.trim()) return

    const newItem = {
      id: Date.now(),
      text: newItemText.trim(),
      completed: false,
    }

    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                checklistItems: [...node.data.checklistItems, newItem],
              },
            }
          : node,
      ),
    )
    setNewItemText("")
  }, [id, newItemText, setNodes])

  // Calculate body height based on node size
  const nodeHeight = CHECKLIST_SIZES[currentDeviceType].height
  const bodyMaxHeight = nodeHeight - 140 // Account for header and footer

  // Custom checklist content
  const checklistContent = (
    <div className="flex flex-col h-full">
      <ChecklistHeader
        title={data.label}
        completedCount={completedCount}
        totalCount={totalCount}
        progress={progress}
        onTitleChange={handleTitleChange}
      />

      <ChecklistBody
        items={checklistItems}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        maxHeight={bodyMaxHeight}
      />

      <div className="p-3 border-t border-gray-200">
        <AddItemInput value={newItemText} onChange={setNewItemText} onAdd={handleAddItem} />
      </div>
    </div>
  )

  return (
    <BaseNode id={id} data={data} selected={selected} nodeType="checklistNode" sizeOptions={CHECKLIST_SIZES}>
      {checklistContent}
    </BaseNode>
  )
}
