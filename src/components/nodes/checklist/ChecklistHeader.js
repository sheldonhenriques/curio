"use client"

import { useState } from "react"
import { ProgressBar } from "@/components/nodes/checklist/ProgressBar"

const ChecklistHeader = ({ title, completedCount, totalCount, progress, onTitleChange }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editableTitle, setEditableTitle] = useState(title)

  const handleDoubleClick = () => setIsEditing(true)

  const handleChange = (e) => setEditableTitle(e.target.value)

  const handleBlur = () => {
    setIsEditing(false)
    if (editableTitle.trim() !== title && onTitleChange) {
      onTitleChange(editableTitle.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBlur()
    }
  }

  return (
    <header className="p-3 border-b border-gray-200">
      <div className="mb-2">
        <div className="text-base font-semibold text-gray-800 truncate">
          {isEditing ? (
            <input
              autoFocus
              value={editableTitle}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="text-base font-semibold text-gray-800 border border-gray-300 rounded px-1 w-full"
            />
          ) : (
            <h3 onDoubleClick={handleDoubleClick} title={title} className="cursor-text">
              {title}
            </h3>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>
          {completedCount} of {totalCount} completed
        </span>
        <span>{progress}%</span>
      </div>
      <ProgressBar progress={progress} />
    </header>
  )
}

export default ChecklistHeader
