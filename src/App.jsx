import { useState } from 'react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function requestCode(event) {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'No se pudo enviar el código')

      setMessage(data.message)
      if (data.debugCode) {
        setMessage(`${data.message} Código de prueba: ${data.debugCode}`)
      }
      setStep('code')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'No se pudo verificar el código')

      setMessage(data.message)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Inicio de sesión</h1>
        <p className="subtitle">
          Ingresa tu correo y te enviaremos un código de acceso.
        </p>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="auth-form">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="auth-form">
            <label htmlFor="code">Código de verificación</label>
            <input
              id="code"
              inputMode="numeric"
              maxLength="6"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setStep('email')}
            >
              Cambiar correo
            </button>
          </form>
        )}

        {message ? <p className="feedback">{message}</p> : null}
      </section>
    </main>
  )
}

export default App
