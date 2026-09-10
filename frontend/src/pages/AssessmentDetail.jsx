import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AssessmentDetail() {
  const { assessmentId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [classData, setClassData] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/assessments/${assessmentId}`)
      .then((a) => {
        setAssessment(a)
        return api.get(`/classes/${a.class_id}`)
      })
      .then(setClassData)
      .catch((err) => setError(err.message))
  }, [assessmentId])

  const myMembership = classData?.memberships.find((m) => m.user.id === user.id)
  const isTeacher = myMembership?.role_in_class === 'teacher'

  useEffect(() => {
    if (isTeacher) {
      api
        .get(`/assessments/${assessmentId}/submissions`)
        .then(setSubmissions)
        .catch(() => {})
    }
  }, [isTeacher, assessmentId])

  async function startOrResume() {
    setError('')
    try {
      const submission = await api.post(`/assessments/${assessmentId}/start`)
      navigate(`/submissions/${submission.id}/take`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!assessment) return <div className="page">{error || 'Chargement...'}</div>

  return (
    <div className="page">
      <h1>{assessment.title}</h1>
      {assessment.description && <p>{assessment.description}</p>}
      {error && <p className="error">{error}</p>}

      <p className="hint">
        {assessment.start_mode === 'fixed'
          ? `Démarrage à ${new Date(assessment.fixed_start_at).toLocaleString('fr-FR')}`
          : 'Démarrage libre'}
        {assessment.duration_minutes ? ` — durée ${assessment.duration_minutes} min` : ''}
      </p>

      {!isTeacher && (
        <button type="button" className="btn-primary" onClick={startOrResume}>
          Commencer / reprendre la copie
        </button>
      )}

      {isTeacher && (
        <section className="card">
          <h2>Copies rendues</h2>
          <ul className="submission-list">
            {submissions.map((s) => (
              <li key={s.id}>
                <Link to={`/submissions/${s.id}/grade`}>{s.student.full_name}</Link>{' '}
                <span className="badge">{s.status}</span>
              </li>
            ))}
            {submissions.length === 0 && <p className="hint">Aucune copie pour l'instant.</p>}
          </ul>
        </section>
      )}
    </div>
  )
}
