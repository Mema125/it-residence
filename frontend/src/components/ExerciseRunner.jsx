import { useRef } from 'react'
import MathEditor from './MathEditor'

/**
 * Student-facing view for one exercise. Renders the right widget for the
 * exercise type and reports the answer `content` shape the backend expects
 * back to the parent via onChange.
 */
export default function ExerciseRunner({ exercise, value, onChange, disabled }) {
  const mathEditorRef = useRef(null)
  const content = value || {}

  if (exercise.type === 'qcm') {
    const selected = content.selected || []
    function toggle(idx) {
      const next = selected.includes(idx) ? selected.filter((i) => i !== idx) : [...selected, idx]
      onChange({ selected: next })
    }
    return (
      <div className="exercise-runner">
        {(exercise.data.choices || []).map((choice, idx) => (
          <label key={idx} className="choice-row">
            <input
              type="checkbox"
              checked={selected.includes(idx)}
              disabled={disabled}
              onChange={() => toggle(idx)}
            />
            {choice}
          </label>
        ))}
      </div>
    )
  }

  if (exercise.type === 'fill_blank') {
    const text = exercise.data.text || ''
    const parts = text.split(/(\{\{\d+\}\})/g)
    const answers = content.answers || {}
    return (
      <div className="exercise-runner fill-blank">
        {parts.map((part, idx) => {
          const match = part.match(/^\{\{(\d+)\}\}$/)
          if (!match) return <span key={idx}>{part}</span>
          const blankId = match[1]
          return (
            <input
              key={idx}
              type="text"
              className="blank-input"
              disabled={disabled}
              value={answers[blankId] || ''}
              onChange={(e) => onChange({ answers: { ...answers, [blankId]: e.target.value } })}
            />
          )
        })}
      </div>
    )
  }

  if (exercise.type === 'matching') {
    const leftItems = exercise.data.left || []
    const rightItems = exercise.data.right || []
    const mapping = content.mapping || {}
    return (
      <div className="exercise-runner">
        {leftItems.map((item, idx) => (
          <div className="form-row" key={idx}>
            <span>{item}</span>
            <select
              disabled={disabled}
              value={mapping[idx] ?? ''}
              onChange={(e) => onChange({ mapping: { ...mapping, [idx]: e.target.value } })}
            >
              <option value="">—</option>
              {rightItems.map((r, rIdx) => (
                <option key={rIdx} value={rIdx}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    )
  }

  if (exercise.type === 'redaction') {
    return (
      <div className="exercise-runner">
        <MathEditor
          ref={mathEditorRef}
          initialHtml={content.html || ''}
          readOnly={disabled}
          onChange={(html) => onChange({ html })}
        />
      </div>
    )
  }

  // free_response
  return (
    <div className="exercise-runner">
      <textarea
        rows={4}
        disabled={disabled}
        value={content.text || ''}
        onChange={(e) => onChange({ text: e.target.value })}
      />
    </div>
  )
}
