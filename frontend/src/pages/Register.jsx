import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register(email, password, fullName, role)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Créer un compte</h1>
        {error && <p className="error">{error}</p>}
        <label>
          Nom complet
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Mot de passe (8 caractères min.)
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Je suis...
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Élève</option>
            <option value="teacher">Professeur</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Créer mon compte
        </button>
        <p>
          Déjà un compte ? <Link to="/login">Connecte-toi</Link>
        </p>
      </form>
    </div>
  )
}
