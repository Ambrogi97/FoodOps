import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService, saveSession } from '../services/api'
import AuthLayout from '../components/AuthLayout'

const ESPERA_REENVIO = 60 // segundos

export default function VerificarEmail() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [email, setEmail]       = useState(searchParams.get('email') || '')
  const [codigo, setCodigo]     = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [espera, setEspera]     = useState(ESPERA_REENVIO) // el código se acaba de enviar

  // Cuenta regresiva para habilitar "Reenviar código"
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  const verificar = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email.trim()) return setError('Ingresá tu email')
    if (codigo.length !== 6) return setError('El código tiene 6 dígitos')
    setLoading(true)
    try {
      const { token, user } = await authService.verificarEmail(email.trim(), codigo)
      saveSession(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      if (err.code === 'CODIGO_VENCIDO' || err.code === 'CODIGO_BLOQUEADO') setCodigo('')
    } finally {
      setLoading(false)
    }
  }

  const reenviar = async () => {
    setError(''); setInfo('')
    if (!email.trim()) return setError('Ingresá tu email')
    try {
      await authService.reenviarCodigo(email.trim())
      setInfo('Te enviamos un código nuevo. Revisá tu bandeja de entrada y la carpeta de spam.')
      setCodigo('')
      setEspera(ESPERA_REENVIO)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthLayout>
      <h1 className="login-title">Confirmá tu email</h1>
      <p className="login-subtitle">
        {searchParams.get('email')
          ? <>Te enviamos un código de 6 dígitos a <strong>{searchParams.get('email')}</strong>. Ingresalo para activar tu cuenta.</>
          : 'Ingresá tu email y el código de 6 dígitos que te enviamos para activar tu cuenta.'}
      </p>

      <form className="login-form" onSubmit={verificar}>
        {!searchParams.get('email') && (
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="Ingresá tu email"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        )}

        <div className="login-field">
          <label htmlFor="codigo">Código de verificación</label>
          <input
            id="codigo"
            className="login-codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
            required
          />
        </div>

        {error && <p className="login-error">{error}</p>}
        {info  && <p className="login-info">{info}</p>}

        <button type="submit" className="login-submit" disabled={loading || codigo.length !== 6}>
          {loading ? 'Verificando...' : 'Confirmar y entrar'}
        </button>
      </form>

      <p className="login-reenviar">
        ¿No te llegó?{' '}
        {espera > 0
          ? <span>Podés pedir otro en {espera} s</span>
          : <button type="button" className="login-forgot-link" onClick={reenviar}>Reenviar código</button>}
      </p>

      <div className="login-divider"><span>o</span></div>

      <Link to="/login" className="login-register-btn">Volver al login</Link>
    </AuthLayout>
  )
}
