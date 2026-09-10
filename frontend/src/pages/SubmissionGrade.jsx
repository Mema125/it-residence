import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import ExerciseRunner from '../components/ExerciseRunner'

function GradingPanel({ exercise, answer, onGraded }) {
  const [score, setScore] = useState(answer.score ?? '')
  const [comment, setComment] = useState(answer.teacher_comment ?? '')
  const [annotations, setAnnotations] = useState(answer.annotations || [])
  const [noteDraft, setNoteDraft] = useState('')
  const [error, setError] = useState('')

  function addAnnotation() {
    if (!noteDraft.trim()) return
    setAnnotations([...annotations, { text: noteDraft.trim() }])
    setNoteDraft('')
  }

  async function saveGrade() {
    setError('')
    try {
      const graded = await api.post(`/answers/${answer.id}/grade`, {
        score: Number(score),
        teacher_comment: comment,
        annotations,
      })
      onGraded(graded)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="grading-panel">
      {error && <p className="error">{error}</p>}
      <div className="annotation-list">
        {annotations.map((note, idx) => (
          <div key={idx} className="annotation">
            {note.text}
          </div>
        ))}
        <div className="form-row">
          <input
            type="text"
            placeholder="Ajouter une annotation ligne par ligne"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={addAnnotation}>
            + Note
          </button>
        </div>
      </div>
      <div className="form-row">
        <label>
          Note (/{exercise.points})
          <input
            type="number"
            min="0"
            max={exercise.points}
            step="0.25"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </label>
      </div>
      <label>
        Commentaire général
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
      </label>
      <button type="button" className="btn-primary" onClick={saveGrade}>
        Enregistrer la note
      </button>
      {answer.graded_at && <p className="hint">Corrigé.</p>}
    </div>
  )
}

export default function SubmissionGrade() {
  const { submissionId } = useParams()
  const [submission, setSubmission] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/submissions/${submissionId}`)
      .then((sub) => {
        setSubmission(sub)
        return api.get(`/assessments/${sub.assessment_id}`)
      })
      .then(setAssessment)
      .catch((err) => setError(err.message))
  }, [submissionId])

  function handleGraded(updatedAnswer) {
    setSubmission((prev) => ({
      ...prev,
      answers: prev.answers.map((a) => (a.id === updatedAnswer.id ? updatedAnswer : a)),
    }))
  }

  async function markGraded() {
    setError('')
    try {
      const updated = await api.post(`/submissions/${submissionId}/mark-graded`)
      setSubmission((prev) => ({ ...prev, status: updated.status }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!assessment || !submission) return <div className="page">{error || 'Chargement...'}</div>

  return (
    <div className="page">
      <h1>Correction — {submission.student.full_name}</h1>
      <p className="hint">{assessment.title}</p>
      {error && <p className="error">{error}</p>}

      {assessment.exercises.map((ex, idx) => {
        const answer = submission.answers.find((a) => a.exercise_id === ex.id)
        return (
          <section className="card exercise-card" key={ex.id}>
            <h2>
              Exercice {idx + 1} — {ex.points} pts
            </h2>
            <p>{ex.prompt}</p>
            {answer ? (
              <>
                <ExerciseRunner exercise={ex} value={answer.content} disabled onChange={() => {}} />
                <GradingPanel exercise={ex} answer={answer} onGraded={handleGraded} />
              </>
            ) : (
              <p className="hint">Pas de réponse.</p>
            )}
          </section>
        )
      })}

      <button type="button" className="btn-primary" onClick={markGraded} disabled={submission.status === 'graded'}>
        {submission.status === 'graded' ? 'Copie corrigée' : 'Marquer la copie comme corrigée'}
      </button>
    </div>
  )
}
