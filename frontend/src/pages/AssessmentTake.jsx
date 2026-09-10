import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ExerciseRunner from '../components/ExerciseRunner'

export default function AssessmentTake() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const saveTimers = useRef({})

  useEffect(() => {
    api
      .get(`/submissions/${submissionId}`)
      .then((sub) => {
        setSubmission(sub)
        const answerMap = {}
        for (const a of sub.answers) answerMap[a.exercise_id] = a.content
        setAnswers(answerMap)
        return api.get(`/assessments/${sub.assessment_id}`)
      })
      .then(setAssessment)
      .catch((err) => setError(err.message))
  }, [submissionId])

  function handleAnswerChange(exerciseId, content) {
    setAnswers((prev) => ({ ...prev, [exerciseId]: content }))
    clearTimeout(saveTimers.current[exerciseId])
    saveTimers.current[exerciseId] = setTimeout(() => {
      api.put(`/submissions/${submissionId}/answers`, { exercise_id: exerciseId, content }).catch((err) => setError(err.message))
    }, 500)
  }

  async function handleSubmitCopy() {
    setError('')
    try {
      // flush any pending debounced saves immediately
      for (const [exerciseId, timer] of Object.entries(saveTimers.current)) {
        clearTimeout(timer)
        await api.put(`/submissions/${submissionId}/answers`, {
          exercise_id: exerciseId,
          content: answers[exerciseId],
        })
      }
      const updated = await api.post(`/submissions/${submissionId}/submit`)
      setSubmission(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!assessment || !submission) return <div className="page">{error || 'Chargement...'}</div>

  const disabled = submission.status !== 'in_progress'

  return (
    <div className="page">
      <h1>{assessment.title}</h1>
      {error && <p className="error">{error}</p>}
      {disabled && <p className="hint">Copie déjà rendue — lecture seule.</p>}

      {assessment.exercises.map((ex, idx) => (
        <section className="card exercise-card" key={ex.id}>
          <h2>
            Exercice {idx + 1} — {ex.points} pts
          </h2>
          <p>{ex.prompt}</p>
          <ExerciseRunner
            exercise={ex}
            value={answers[ex.id]}
            disabled={disabled}
            onChange={(content) => handleAnswerChange(ex.id, content)}
          />
        </section>
      ))}

      {!disabled && (
        <button type="button" className="btn-primary" onClick={handleSubmitCopy}>
          Rendre la copie
        </button>
      )}
      {disabled && (
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
          Retour
        </button>
      )}
    </div>
  )
}
