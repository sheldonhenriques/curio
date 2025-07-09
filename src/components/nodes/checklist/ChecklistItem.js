"use client"

import { useCallback } from "react"
import { X } from "lucide-react"

const ChecklistItem = ({ item, onToggle, onDelete }) => {
  const handleToggle = useCallback(() => {
    onToggle(item.id)
  }, [item.id, onToggle])

  const handleDelete = useCallback(() => {
    onDelete(item.id)
  }, [item.id, onDelete])

  return (
    <div className="flex items-center space-x-3 group py-1">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={handleToggle}
        className="h-4 w-4 accent-black rounded border-gray-300 focus:ring-black focus:ring-2"
        aria-label={`Mark "${item.text}" as ${item.completed ? "incomplete" : "complete"}`}
      />
      <span
        onClick={handleToggle}
        className={`flex-1 text-sm transition-all duration-200 cursor-pointer select-none ${
          item.completed ? "line-through text-gray-500" : "text-gray-800"
        }`}
      >
        {item.text}
      </span>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
        aria-label={`Delete "${item.text}"`}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default ChecklistItem
