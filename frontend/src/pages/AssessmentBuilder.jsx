import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ExerciseEditor from '../components/ExerciseEditor'

export default function AssessmentBuilder() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startMode, setStartMode] = useState('self_paced')
  const [fixedStartAt, setFixedStartAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [error, setError] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [exercises, setExercises] = useState([])
  const [showExerciseForm, setShowExerciseForm] = useState(false)

  async function createAssessment(e) {
    e.preventDefault()
    setError('')
    try {
      const created = await api.post(`/classes/${classId}/assessments`, {
        title,
        description,
        start_mode: startMode,
        fixed_start_at: startMode === 'fixed' && fixedStartAt ? new Date(fixedStartAt).toISOString() : null,
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      })
      setAssessment(created)
    } catch (err) {
      setError(err.message)
    }
  }

  async function addExercise(payload) {
    setError('')
    try {
      const exercise = await api.post(`/assessments/${assessment.id}/exercises`, {
        ...payload,
        order: exercises.length,
      })
      setExercises([...exercises, exercise])
      setShowExerciseForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!assessment) {
    return (
      <div className="page">
        <h1>Nouvelle évaluation</h1>
        {error && <p className="error">{error}</p>}
        <form className="card" onSubmit={createAssessment}>
          <label>
            Titre
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <label>
            Démarrage
            <select value={startMode} onChange={(e) => setStartMode(e.target.value)}>
              <option value="self_paced">Libre — chaque élève démarre quand il est prêt</option>
              <option value="fixed">Heure fixe imposée</option>
            </select>
          </label>
          {startMode === 'fixed' && (
            <label>
              Heure de début
              <input
                type="datetime-local"
                value={fixedStartAt}
                onChange={(e) => setFixedStartAt(e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Durée (minutes, optionnel)
            <input type="number" min="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary">
            Créer l'évaluation
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>{assessment.title}</h1>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <div className="section-header">
          <h2>Exercices</h2>
          {!showExerciseForm && (
            <button type="button" className="btn-primary" onClick={() => setShowExerciseForm(true)}>
              + Ajouter un exercice
            </button>
          )}
        </div>
        <ol className="exercise-list">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <strong>{ex.prompt || '(sans consigne)'}</strong> — {ex.points} pts
            </li>
          ))}
        </ol>
        {showExerciseForm && <ExerciseEditor onSave={addExercise} onCancel={() => setShowExerciseForm(false)} />}
      </section>

      <button type="button" className="btn-secondary" onClick={() => navigate(`/classes/${classId}`)}>
        Retour à la classe
      </button>
    </div>
  )
}
