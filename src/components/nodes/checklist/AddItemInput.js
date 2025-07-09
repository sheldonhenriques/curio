"use client"

import { useCallback } from "react"
import { Plus } from "lucide-react"

const AddItemInput = ({ value, onChange, onAdd, placeholder = "Add a new item", disabled = false }) => {
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onAdd()
      }
    },
    [onAdd],
  )

  const isDisabled = disabled || !value.trim()

  return (
    <div className="flex space-x-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
        aria-label="New checklist item"
      />
      <button
        onClick={onAdd}
        disabled={isDisabled}
        className="px-2 py-1 bg-black text-white rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Add new item"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default AddItemInput
