"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown, ChevronRight } from "lucide-react"

const PropertySection = ({ title, children, isOpen, onToggle }) => (
  <div className="border-b border-gray-200">
    <button
      onClick={onToggle}
      className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {title}
      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
    {isOpen && <div className="px-3 pb-3">{children}</div>}
  </div>
)

const InputField = ({ label, value, onChange, type = "text", options = null, suffix = null, allowCustom = false }) => {
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')

  // Check if current value is a custom (arbitrary) value
  const isCurrentValueCustom = options && !options.some(opt => opt.value === value) && value !== ''

  const handleValueChange = (newValue) => {
    if (newValue === 'custom') {
      setIsCustom(true)
      setCustomValue('')
    } else {
      setIsCustom(false)
      onChange(newValue)
    }
  }

  const handleCustomValueChange = (newCustomValue) => {
    setCustomValue(newCustomValue)
    onChange(newCustomValue)
  }

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {options ? (
        <div className="space-y-1">
          <select
            value={isCurrentValueCustom ? 'custom' : (isCustom ? 'custom' : value)}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full px-2 py-1 text-xs text-black border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {allowCustom && <option value="custom">Custom Value</option>}
          </select>
          {(isCustom || isCurrentValueCustom) && (
            <input
              type="text"
              value={isCurrentValueCustom ? value : customValue}
              onChange={(e) => handleCustomValueChange(e.target.value)}
              placeholder="e.g., m-[23px], bg-[#1da1f2]"
              className="w-full px-2 py-1 text-xs text-black border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center">
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-2 py-1 text-xs text-black border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
          {suffix && <span className="ml-1 text-xs text-gray-500">{suffix}</span>}
        </div>
      )}
    </div>
  )
}

const FloatingPropertyPanel = ({ element, isVisible, onClose, onPropertyChange }) => {
  const [openSections, setOpenSections] = useState({
    layout: true,
    typography: false,
    background: false,
    content: false,
    advanced: false
  })

  const [properties, setProperties] = useState({
    // Layout
    margin: '',
    padding: '',
    width: '',
    height: '',
    display: '',
    position: '',
    
    // Typography  
    fontSize: '',
    fontWeight: '',
    textColor: '',
    textAlign: '',
    
    // Background & Borders
    backgroundColor: '',
    borderWidth: '',
    borderColor: '',
    borderRadius: '',
    
    // Content
    textContent: '',
    
    // Advanced
    opacity: '',
    zIndex: '',
    transform: '',
    overflow: ''
  })

  // Extract current values from element when it changes
  useEffect(() => {
    if (!element) return

    const styles = element.computedStyles || {}
    const tailwind = element.tailwindClasses || {}

    setProperties({
      // Layout - extract from Tailwind classes or computed styles
      margin: tailwind.margin?.[0] || '',
      padding: tailwind.padding?.[0] || '',
      width: tailwind.width?.[0] || '',
      height: tailwind.height?.[0] || '',
      display: tailwind.display?.[0] || styles.display || '',
      position: tailwind.position?.[0] || styles.position || '',
      
      // Typography
      fontSize: tailwind.textSize?.[0] || '',
      fontWeight: extractFontWeight(styles.fontWeight),
      textColor: tailwind.textColor?.[0] || '',
      textAlign: extractTextAlign(styles.textAlign),
      
      // Background & Borders
      backgroundColor: tailwind.backgroundColor?.[0] || '',
      borderWidth: tailwind.border?.[0] || '',
      borderColor: '',
      borderRadius: tailwind.rounded?.[0] || '',
      
      // Content
      textContent: element.textContent || '',
      
      // Advanced
      opacity: styles.opacity || '',
      zIndex: styles.zIndex || '',
      transform: styles.transform || '',
      overflow: styles.overflow || ''
    })
  }, [element])

  const extractFontWeight = (fontWeight) => {
    const weightMap = {
      '100': 'font-thin',
      '200': 'font-extralight', 
      '300': 'font-light',
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
      '800': 'font-extrabold',
      '900': 'font-black'
    }
    return weightMap[fontWeight] || ''
  }

  const extractTextAlign = (textAlign) => {
    const alignMap = {
      'left': 'text-left',
      'center': 'text-center', 
      'right': 'text-right',
      'justify': 'text-justify'
    }
    return alignMap[textAlign] || ''
  }

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handlePropertyChange = (property, value) => {
    setProperties(prev => ({
      ...prev,
      [property]: value
    }))
    
    // Notify parent component
    onPropertyChange?.(property, value)
  }

  if (!isVisible || !element) return null

  // Tailwind spacing options
  const spacingOptions = [
    { value: '', label: 'Default' },
    { value: '0', label: '0' },
    { value: '1', label: '1 (4px)' },
    { value: '2', label: '2 (8px)' },
    { value: '3', label: '3 (12px)' },
    { value: '4', label: '4 (16px)' },
    { value: '5', label: '5 (20px)' },
    { value: '6', label: '6 (24px)' },
    { value: '8', label: '8 (32px)' },
    { value: '10', label: '10 (40px)' },
    { value: '12', label: '12 (48px)' },
    { value: '16', label: '16 (64px)' },
    { value: '20', label: '20 (80px)' },
    { value: '24', label: '24 (96px)' }
  ]

  const displayOptions = [
    { value: '', label: 'Default' },
    { value: 'block', label: 'Block' },
    { value: 'inline-block', label: 'Inline Block' },
    { value: 'inline', label: 'Inline' },
    { value: 'flex', label: 'Flex' },
    { value: 'grid', label: 'Grid' },
    { value: 'hidden', label: 'Hidden' }
  ]

  const fontSizeOptions = [
    { value: '', label: 'Default' },
    { value: 'text-xs', label: 'XS (12px)' },
    { value: 'text-sm', label: 'Small (14px)' },
    { value: 'text-base', label: 'Base (16px)' },
    { value: 'text-lg', label: 'Large (18px)' },
    { value: 'text-xl', label: 'XL (20px)' },
    { value: 'text-2xl', label: '2XL (24px)' },
    { value: 'text-3xl', label: '3XL (30px)' },
    { value: 'text-4xl', label: '4XL (36px)' }
  ]

  const fontWeightOptions = [
    { value: '', label: 'Default' },
    { value: 'font-thin', label: 'Thin' },
    { value: 'font-light', label: 'Light' },
    { value: 'font-normal', label: 'Normal' },
    { value: 'font-medium', label: 'Medium' },
    { value: 'font-semibold', label: 'Semibold' },
    { value: 'font-bold', label: 'Bold' },
    { value: 'font-black', label: 'Black' }
  ]

  const textAlignOptions = [
    { value: '', label: 'Default' },
    { value: 'text-left', label: 'Left' },
    { value: 'text-center', label: 'Center' },
    { value: 'text-right', label: 'Right' },
    { value: 'text-justify', label: 'Justify' }
  ]

  return (
    <div className="fixed top-20 right-0 w-80 h-[calc(100vh-5rem)] bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Element Properties</h3>
          <p className="text-xs text-gray-500">{element.tagName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layout Section */}
      <PropertySection
        title="Layout"
        isOpen={openSections.layout}
        onToggle={() => toggleSection('layout')}
      >
        <InputField
          label="Margin"
          value={properties.margin}
          onChange={(value) => handlePropertyChange('margin', value)}
          options={spacingOptions.map(opt => ({
            ...opt,
            value: opt.value ? `m-${opt.value}` : '',
            label: opt.value ? `m-${opt.value} ${opt.label.includes('(') ? opt.label.split(' ')[1] : ''}`.trim() : opt.label
          }))}
          allowCustom={true}
        />
        <InputField
          label="Padding"
          value={properties.padding}
          onChange={(value) => handlePropertyChange('padding', value)}
          options={spacingOptions.map(opt => ({
            ...opt,
            value: opt.value ? `p-${opt.value}` : '',
            label: opt.value ? `p-${opt.value} ${opt.label.includes('(') ? opt.label.split(' ')[1] : ''}`.trim() : opt.label
          }))}
          allowCustom={true}
        />
        <InputField
          label="Display"
          value={properties.display}
          onChange={(value) => handlePropertyChange('display', value)}
          options={displayOptions}
        />
      </PropertySection>

      {/* Typography Section */}
      <PropertySection
        title="Typography"
        isOpen={openSections.typography}
        onToggle={() => toggleSection('typography')}
      >
        <InputField
          label="Font Size"
          value={properties.fontSize}
          onChange={(value) => handlePropertyChange('fontSize', value)}
          options={fontSizeOptions}
          allowCustom={true}
        />
        <InputField
          label="Font Weight"
          value={properties.fontWeight}
          onChange={(value) => handlePropertyChange('fontWeight', value)}
          options={fontWeightOptions}
          allowCustom={true}
        />
        <InputField
          label="Text Align"
          value={properties.textAlign}
          onChange={(value) => handlePropertyChange('textAlign', value)}
          options={textAlignOptions}
        />
      </PropertySection>

      {/* Background & Borders Section */}
      <PropertySection
        title="Background & Borders"
        isOpen={openSections.background}
        onToggle={() => toggleSection('background')}
      >
        <InputField
          label="Background Color"
          value={properties.backgroundColor}
          onChange={(value) => handlePropertyChange('backgroundColor', value)}
          type="text"
          allowCustom={true}
        />
        <InputField
          label="Border Radius"
          value={properties.borderRadius}
          onChange={(value) => handlePropertyChange('borderRadius', value)}
          type="text"
          allowCustom={true}
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection
        title="Content"
        isOpen={openSections.content}
        onToggle={() => toggleSection('content')}
      >
        <InputField
          label="Text Content"
          value={properties.textContent}
          onChange={(value) => handlePropertyChange('textContent', value)}
          type="text"
        />
      </PropertySection>

      {/* Advanced Section */}
      <PropertySection
        title="Advanced"
        isOpen={openSections.advanced}
        onToggle={() => toggleSection('advanced')}
      >
        <InputField
          label="Opacity"
          value={properties.opacity}
          onChange={(value) => handlePropertyChange('opacity', value)}
          type="text"
        />
        <InputField
          label="Z-Index"
          value={properties.zIndex}
          onChange={(value) => handlePropertyChange('zIndex', value)}
          type="text"
        />
      </PropertySection>
    </div>
  )
}

export default FloatingPropertyPanel