"use client"

import { useState } from "react"
import { Server, AlertCircle, Eye, EyeOff } from "lucide-react"

const WebserverHeader = ({ url, path, onPathChange, hasError, isInspectorActive, onInspectorToggle }) => {
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

      {/* Inspector Toggle Button */}
      <button
        onClick={onInspectorToggle}
        className={`p-1.5 rounded transition-colors duration-200 flex-shrink-0 ${
          isInspectorActive
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title={isInspectorActive ? 'Stop Inspecting (Esc)' : 'Inspect Element (Ctrl+Shift+I)'}
      >
        {isInspectorActive ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>

      {hasError && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
    </div>
  )
}

export default WebserverHeader
