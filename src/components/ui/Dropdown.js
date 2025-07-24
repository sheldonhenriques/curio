'use client';

import { useState, useRef, useEffect } from 'react';

export default function Dropdown({
  trigger,
  children,
  align = 'right', // 'left', 'right', 'center'
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const getAlignmentClasses = () => {
    switch (align) {
      case 'left':
        return 'left-0';
      case 'center':
        return 'left-1/2 transform -translate-x-1/2';
      case 'right':
      default:
        return 'right-0';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div ref={triggerRef} onClick={toggleDropdown}>
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute top-full mt-1 z-50 ${getAlignmentClasses()}`}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-48">
            {typeof children === 'function' 
              ? children({ closeDropdown }) 
              : children
            }
          </div>
        </div>
      )}
    </div>
  );
}

// Dropdown Item Component
export function DropdownItem({
  children,
  onClick,
  className = '',
  variant = 'default', // 'default', 'danger'
  disabled = false
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  const getVariantClasses = () => {
    if (disabled) {
      return 'text-gray-400 cursor-not-allowed';
    }
    
    switch (variant) {
      case 'danger':
        return 'text-red-700 hover:bg-red-50 hover:text-red-800';
      case 'default':
      default:
        return 'text-gray-700 hover:bg-gray-50 hover:text-gray-900';
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${getVariantClasses()} ${className}`}
    >
      {children}
    </button>
  );
}

// Dropdown Separator Component
export function DropdownSeparator() {
  return <div className="h-px bg-gray-200 my-1" />;
}