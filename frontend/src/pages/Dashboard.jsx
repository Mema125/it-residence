import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function loadClasses() {
    api.get('/classes').then(setClasses).catch((err) => setError(err.message))
  }

  useEffect(loadClasses, [])

  async function handleCreateClass(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/classes', { name })
      setName('')
      loadClasses()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <h1>Mes classes</h1>

      {user.role === 'teacher' && (
        <form className="card inline-form" onSubmit={handleCreateClass}>
          <input
            type="text"
            placeholder="Nom de la classe (ex: Terminale S1)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            Créer une classe
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      <div className="class-list">
        {classes.map((c) => (
          <Link to={`/classes/${c.id}`} key={c.id} className="card class-card">
            <h2>{c.name}</h2>
          </Link>
        ))}
        {classes.length === 0 && <p className="hint">Aucune classe pour l'instant.</p>}
      </div>
    </div>
  )
}
