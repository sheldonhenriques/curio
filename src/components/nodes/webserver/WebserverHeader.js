"use client"

import { useState } from "react"
import { Server, AlertCircle, MousePointer2 } from "lucide-react"

const WebserverHeader = ({ url, path, onPathChange, hasError, isSelectModeActive, onSelectModeToggle }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editablePath, setEditablePath] = useState(path)

  const handleDoubleClick = () => setIsEditing(true)

  const handleChange = (e) => setEditablePath(e.target.value)

  const handleBlur = () => {
    setIsEditing(false)
    if (editablePath.trim() !== path && onPathChange) {
      onPathChange(editablePath.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBlur()
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50 rounded-t-lg">
      <Server className="w-4 h-4 text-gray-600 flex-shrink-0" />

      {isEditing ? (
        <input
          autoFocus
          value={editablePath}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm font-mono bg-white border border-gray-300 rounded px-2 py-1"
          placeholder="/path"
        />
      ) : (
        <span
          onDoubleClick={handleDoubleClick}
          className="flex-1 text-sm font-mono text-gray-800 cursor-text truncate"
          title={path}
        >
          {path}
        </span>
      )}

      {/* Select Mode Toggle Button */}
      <button
        onClick={onSelectModeToggle}
        className={`p-1 rounded transition-colors flex-shrink-0 ${
          isSelectModeActive
            ? 'bg-blue-500 text-white shadow-sm' 
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title={isSelectModeActive ? 'Exit Select Mode' : 'Enter Select Mode'}
      >
        <MousePointer2 className="w-4 h-4" />
      </button>

      {hasError && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
    </div>
  )
}

export default WebserverHeader
