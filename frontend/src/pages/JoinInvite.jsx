import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  class_leader: 'chef de classe',
  student: 'élève',
}

export default function JoinInvite() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!user) return
    api
      .get(`/invites/${token}`)
      .then(setPreview)
      .catch((err) => setError(err.message))
  }, [token, user])

  async function accept() {
    setError('')
    try {
      await api.post(`/invites/${token}/accept`)
      setJoined(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user) {
    return (
      <div className="page">
        <p>Connecte-toi ou crée un compte pour rejoindre la classe.</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>
          Se connecter
        </button>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="page">
        <p>Tu as rejoint la classe !</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Retour à mes classes
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        {error && <p className="error">{error}</p>}
        {preview && (
          <>
            <h1>Rejoindre {preview.class_name}</h1>
            <p>
              Tu vas rejoindre cette classe en tant que <strong>{ROLE_LABELS[preview.role_to_grant]}</strong>.
            </p>
            {preview.already_used ? (
              <p className="error">Cette invitation a déjà été utilisée.</p>
            ) : (
              <button className="btn-primary" onClick={accept}>
                Rejoindre la classe
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
