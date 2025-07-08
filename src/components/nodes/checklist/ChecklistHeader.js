import { useState } from 'react';
import { Expand, Minimize } from 'lucide-react';
import { ProgressBar } from '@/components/nodes/checklist/ProgressBar';

const ChecklistHeader = ({
  title,
  completedCount,
  totalCount,
  progress,
  onTitleChange,
  onResizeClick,
  isMaxSize
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title);

  const handleDoubleClick = () => setIsEditing(true);
  const handleChange = (e) => setEditableTitle(e.target.value);

  const handleBlur = () => {
    setIsEditing(false);
    if (editableTitle.trim() !== title && onTitleChange) {
      onTitleChange(editableTitle.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <header className="p-4 border-b border-gray-200 relative">
      <div className="flex items-start justify-between mb-2">
        <div className="text-lg font-semibold text-gray-800 truncate">
          {isEditing ? (
            <input
              autoFocus
              value={editableTitle}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="text-lg font-semibold text-gray-800 border border-gray-300 rounded px-1"
            />
          ) : (
            <h3
              onDoubleClick={handleDoubleClick}
              title={title}
              className="cursor-text"
            >
              {title}
            </h3>
          )}
        </div>

        <button
          onClick={onResizeClick}
          className="text-gray-500 hover:text-black p-1"
          aria-label="Resize"
        >
          {isMaxSize ? <Minimize size={16} /> : <Expand size={16} />}
        </button>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
        <span>{completedCount} of {totalCount} completed</span>
        <span className="mt-[2px]">{progress}%</span>
      </div>

      <ProgressBar progress={progress} />
    </header>
  );
};

export default ChecklistHeader;
