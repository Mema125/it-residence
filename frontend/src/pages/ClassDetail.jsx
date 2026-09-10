import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  teacher: 'Professeur',
  class_leader: 'Chef de classe',
  student: 'Élève',
}

export default function ClassDetail() {
  const { classId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [chefEmail, setChefEmail] = useState('')

  function load() {
    api.get(`/classes/${classId}`).then(setClassData).catch((err) => setError(err.message))
    api.get(`/classes/${classId}/assessments`).then(setAssessments).catch(() => {})
  }

  useEffect(load, [classId])

  const myMembership = classData?.memberships.find((m) => m.user.id === user.id)
  const canInviteStudents = myMembership?.role_in_class === 'teacher' || myMembership?.role_in_class === 'class_leader'
  const isTeacher = myMembership?.role_in_class === 'teacher'

  async function inviteClassLeader(e) {
    e.preventDefault()
    setError('')
    try {
      const invite = await api.post(`/classes/${classId}/invites`, {
        role_to_grant: 'class_leader',
        target_email: chefEmail,
      })
      setInviteLink(`${window.location.origin}/join/${invite.token}`)
      setChefEmail('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function createStudentLink() {
    setError('')
    try {
      const invite = await api.post(`/classes/${classId}/invites`, { role_to_grant: 'student' })
      setInviteLink(`${window.location.origin}/join/${invite.token}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!classData) return <div className="page">{error || 'Chargement...'}</div>

  return (
    <div className="page">
      <h1>{classData.name}</h1>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Membres</h2>
        <ul className="member-list">
          {classData.memberships.map((m) => (
            <li key={m.id}>
              {m.user.full_name} — <span className="badge">{ROLE_LABELS[m.role_in_class]}</span>
            </li>
          ))}
        </ul>
      </section>

      {isTeacher && (
        <section className="card">
          <h2>Désigner un chef de classe</h2>
          <form className="inline-form" onSubmit={inviteClassLeader}>
            <input
              type="email"
              placeholder="email de l'élève"
              value={chefEmail}
              onChange={(e) => setChefEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">
              Envoyer l'invitation
            </button>
          </form>
        </section>
      )}

      {canInviteStudents && (
        <section className="card">
          <h2>Inviter des élèves</h2>
          <p className="hint">Génère un lien à partager avec tes camarades — réutilisable par plusieurs élèves.</p>
          <button type="button" className="btn-secondary" onClick={createStudentLink}>
            Générer un lien d'invitation
          </button>
        </section>
      )}

      {inviteLink && (
        <section className="card">
          <h2>Lien d'invitation</h2>
          <input type="text" readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
        </section>
      )}

      <section className="card">
        <div className="section-header">
          <h2>Évaluations</h2>
          {isTeacher && (
            <button type="button" className="btn-primary" onClick={() => navigate(`/classes/${classId}/new-assessment`)}>
              + Nouvelle évaluation
            </button>
          )}
        </div>
        <ul className="assessment-list">
          {assessments.map((a) => (
            <li key={a.id}>
              <Link to={`/assessments/${a.id}`}>{a.title}</Link>
              <span className="badge">{a.start_mode === 'fixed' ? 'Heure fixe' : 'Libre'}</span>
            </li>
          ))}
          {assessments.length === 0 && <p className="hint">Aucune évaluation pour l'instant.</p>}
        </ul>
      </section>
    </div>
  )
}
