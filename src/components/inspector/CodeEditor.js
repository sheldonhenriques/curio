"use client"

import { useEffect, useRef, useState } from "react"
import { EditorView, keymap } from "@codemirror/view"
import { EditorState, Extension } from "@codemirror/state"
import { basicSetup } from "@codemirror/basic-setup"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { oneDark } from "@codemirror/theme-one-dark"
import { indentWithTab } from "@codemirror/commands"
import { 
  Save, 
  FileText, 
  Code, 
  Palette, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react"

const languageMap = {
  css: { extension: css(), label: "CSS", icon: Palette },
  html: { extension: html(), label: "HTML", icon: Code },
  javascript: { extension: javascript(), label: "JavaScript", icon: FileText },
  js: { extension: javascript(), label: "JavaScript", icon: FileText },
  jsx: { extension: javascript(), label: "JSX", icon: FileText },
  ts: { extension: javascript(), label: "TypeScript", icon: FileText },
  tsx: { extension: javascript(), label: "TSX", icon: FileText }
}

const CodeEditor = ({ 
  content = "", 
  language = "css", 
  fileName = "styles.css",
  readOnly = false,
  height = "400px",
  theme = "light",
  onChange,
  onSave,
  projectId
}) => {
  const editorRef = useRef(null)
  const viewRef = useRef(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return

    const languageConfig = languageMap[language] || languageMap.css
    
    const extensions = [
      basicSetup,
      languageConfig.extension,
      keymap.of([
        indentWithTab,
        {
          key: "Ctrl-s",
          preventDefault: true,
          run: () => {
            handleSave()
            return true
          }
        }
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          const newContent = update.state.doc.toString()
          onChange(newContent)
          setHasChanges(newContent !== content)
        }
      }),
      EditorView.theme({
        "&": { 
          height: height,
          fontSize: "14px"
        },
        ".cm-content": {
          padding: "16px",
          minHeight: height
        },
        ".cm-focused": {
          outline: "none"
        },
        ".cm-editor": {
          borderRadius: "6px"
        },
        ".cm-scroller": {
          fontFamily: "'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace"
        }
      })
    ]

    if (theme === "dark") {
      extensions.push(oneDark)
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true))
    }

    const state = EditorState.create({
      doc: content,
      extensions
    })

    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, theme, readOnly, height]) // Don't include content to avoid recreating editor

  // Update content when prop changes
  useEffect(() => {
    if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: content
        }
      })
      viewRef.current.dispatch(transaction)
      setHasChanges(false)
    }
  }, [content])

  const handleSave = async () => {
    if (!viewRef.current || !onSave || saving) return

    const currentContent = viewRef.current.state.doc.toString()
    setSaving(true)
    setSaveStatus(null)

    try {
      await onSave(currentContent, fileName)
      setHasChanges(false)
      setSaveStatus('success')
      
      // Clear success status after 2 seconds
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (error) {
      console.error('Failed to save file:', error)
      setSaveStatus('error')
      
      // Clear error status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (viewRef.current && content) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: content
        }
      })
      viewRef.current.dispatch(transaction)
      setHasChanges(false)
    }
  }

  const getFileExtension = (filename) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const languageConfig = languageMap[language] || languageMap.css
  const IconComponent = languageConfig.icon

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">{fileName}</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
            {languageConfig.label}
          </span>
          {hasChanges && (
            <div className="w-2 h-2 bg-orange-400 rounded-full" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Saved</span>
            </div>
          )}
          
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Error</span>
            </div>
          )}

          {/* Action Buttons */}
          {!readOnly && (
            <>
              <button
                onClick={handleReset}
                disabled={!hasChanges || saving}
                className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                title="Reset changes (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleSave}
                disabled={!hasChanges || saving || !onSave}
                className={`p-1.5 rounded transition-colors duration-150 flex items-center gap-1 ${
                  hasChanges && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Save file (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
                {saving && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={editorRef} 
          className="absolute inset-0 text-sm"
          style={{ height: '100%' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Lines: {viewRef.current?.state.doc.lines || 0}</span>
          <span>
            Length: {viewRef.current?.state.doc.length || content.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {readOnly && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
              Read-only
            </span>
          )}
          <span>Ctrl+S to save</span>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor