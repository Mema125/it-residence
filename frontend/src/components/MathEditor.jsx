import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function renderLatex(latex) {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false })
  } catch {
    return latex
  }
}

/**
 * Rich-text editor where the user writes a normal paragraph and inserts
 * LaTeX formulas inline, at the cursor, like on paper. Uncontrolled by
 * design: parent reads the current HTML via ref.getContent() (e.g. on
 * save/blur) instead of re-rendering the editable div on every keystroke,
 * which would fight the browser's own cursor position.
 */
const MathEditor = forwardRef(function MathEditor({ initialHtml = '', onChange, readOnly = false }, ref) {
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const editingSpanRef = useRef(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [formulaInput, setFormulaInput] = useState('')

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.innerHTML ?? '',
  }))

  useEffect(() => {
    if (editorRef.current && initialHtml) {
      editorRef.current.innerHTML = initialHtml
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onSelectionChange() {
      const editor = editorRef.current
      if (!editor) return
      const sel = window.getSelection()
      if (sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      if (editor.contains(range.startContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  function emitChange() {
    onChange?.(editorRef.current?.innerHTML ?? '')
  }

  function openInsertPopup() {
    editingSpanRef.current = null
    setFormulaInput('')
    setPopupOpen(true)
  }

  function openEditPopup(span) {
    editingSpanRef.current = span
    setFormulaInput(span.dataset.latex || '')
    setPopupOpen(true)
  }

  function handleEditorClick(e) {
    if (readOnly) return
    const span = e.target.closest?.('.math-inline')
    if (span && editorRef.current?.contains(span)) {
      openEditPopup(span)
    }
  }

  function confirmFormula() {
    const latex = formulaInput.trim()
    if (!latex) {
      setPopupOpen(false)
      return
    }
    const editor = editorRef.current
    editor.focus()

    if (editingSpanRef.current) {
      const span = editingSpanRef.current
      span.dataset.latex = latex
      span.innerHTML = renderLatex(latex)
    } else {
      const sel = window.getSelection()
      let range = savedRangeRef.current
      if (!range || !editor.contains(range.startContainer)) {
        range = document.createRange()
        range.selectNodeContents(editor)
        range.collapse(false)
      }
      sel.removeAllRanges()
      sel.addRange(range)

      const span = document.createElement('span')
      span.className = 'math-inline'
      span.contentEditable = 'false'
      span.dataset.latex = latex
      span.innerHTML = renderLatex(latex)

      range.deleteContents()
      range.insertNode(span)

      const spaceNode = document.createTextNode(' ')
      span.after(spaceNode)
      const newRange = document.createRange()
      newRange.setStart(spaceNode, 1)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
      savedRangeRef.current = newRange.cloneRange()
    }

    setPopupOpen(false)
    emitChange()
  }

  return (
    <div className="math-editor">
      {!readOnly && (
        <div className="math-editor-toolbar">
          <button type="button" onClick={openInsertPopup} className="btn-secondary">
            √∑ Insérer une formule
          </button>
        </div>
      )}

      {popupOpen && (
        <div className="formula-popup">
          <input
            autoFocus
            type="text"
            placeholder="ex: \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmFormula()
              }
              if (e.key === 'Escape') setPopupOpen(false)
            }}
          />
          <div className="formula-preview" dangerouslySetInnerHTML={{ __html: renderLatex(formulaInput || '') }} />
          <div className="formula-popup-actions">
            <button type="button" onClick={confirmFormula} className="btn-primary">
              Insérer
            </button>
            <button type="button" onClick={() => setPopupOpen(false)} className="btn-secondary">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="math-editor-surface"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onClick={handleEditorClick}
        onBlur={emitChange}
      />
    </div>
  )
})

export default MathEditor
