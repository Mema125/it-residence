import { useState } from 'react'

const TYPE_LABELS = {
  qcm: 'QCM',
  fill_blank: 'Texte à trous',
  matching: 'Correspondance',
  free_response: 'Réponse libre',
  redaction: 'Rédaction (texte + formules)',
}

/**
 * Teacher-facing builder for one exercise. Keeps a local draft and only
 * calls onSave with the assembled { type, prompt, points, data } payload.
 */
export default function ExerciseEditor({ onSave, onCancel }) {
  const [type, setType] = useState('qcm')
  const [prompt, setPrompt] = useState('')
  const [points, setPoints] = useState(1)
  const [choices, setChoices] = useState(['', ''])
  const [correctIndices, setCorrectIndices] = useState([])
  const [fillText, setFillText] = useState('La formule est {{1}} = mc^2')
  const [fillAnswers, setFillAnswers] = useState({ 1: '' })
  const [left, setLeft] = useState(['', ''])
  const [right, setRight] = useState(['', ''])

  function toggleCorrect(idx) {
    setCorrectIndices((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]))
  }

  function buildData() {
    if (type === 'qcm') return { choices, correct_indices: correctIndices }
    if (type === 'fill_blank') return { text: fillText, answers: fillAnswers }
    if (type === 'matching')
      return { left, right, correct_map: Object.fromEntries(left.map((_, i) => [String(i), String(i)])) }
    return {}
  }

  function handleSave() {
    onSave({ type, prompt, points: Number(points), data: buildData() })
  }

  return (
    <div className="card exercise-editor">
      <div className="form-row">
        <label>
          Type d'exercice
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Points
          <input type="number" min="0" step="0.5" value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
      </div>

      <label>
        Consigne
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} />
      </label>

      {type === 'qcm' && (
        <div className="type-fields">
          {choices.map((choice, idx) => (
            <div className="form-row" key={idx}>
              <input
                type="checkbox"
                checked={correctIndices.includes(idx)}
                onChange={() => toggleCorrect(idx)}
                title="Bonne réponse"
              />
              <input
                type="text"
                placeholder={`Choix ${idx + 1}`}
                value={choice}
                onChange={(e) => {
                  const next = [...choices]
                  next[idx] = e.target.value
                  setChoices(next)
                }}
              />
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setChoices([...choices, ''])}>
            + Ajouter un choix
          </button>
        </div>
      )}

      {type === 'fill_blank' && (
        <div className="type-fields">
          <label>
            Texte avec trous (utiliser {'{{1}}'}, {'{{2}}'}, ...)
            <textarea value={fillText} onChange={(e) => setFillText(e.target.value)} rows={2} />
          </label>
          <label>
            Réponses attendues (JSON, ex: {'{"1":"E"}'})
            <input
              type="text"
              value={JSON.stringify(fillAnswers)}
              onChange={(e) => {
                try {
                  setFillAnswers(JSON.parse(e.target.value))
                } catch {
                  // ignore invalid JSON while typing
                }
              }}
            />
          </label>
        </div>
      )}

      {type === 'matching' && (
        <div className="type-fields">
          <p className="hint">Les éléments de même index se correspondent.</p>
          {left.map((_, idx) => (
            <div className="form-row" key={idx}>
              <input
                type="text"
                placeholder={`Gauche ${idx + 1}`}
                value={left[idx]}
                onChange={(e) => {
                  const next = [...left]
                  next[idx] = e.target.value
                  setLeft(next)
                }}
              />
              <input
                type="text"
                placeholder={`Droite ${idx + 1}`}
                value={right[idx]}
                onChange={(e) => {
                  const next = [...right]
                  next[idx] = e.target.value
                  setRight(next)
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setLeft([...left, ''])
              setRight([...right, ''])
            }}
          >
            + Ajouter une paire
          </button>
        </div>
      )}

      {(type === 'free_response' || type === 'redaction') && (
        <p className="hint">
          {type === 'redaction'
            ? "L'élève rédigera sa réponse avec l'éditeur texte + formules."
            : "L'élève répondra en texte libre."}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={handleSave}>
          Ajouter l'exercice
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  )
}
