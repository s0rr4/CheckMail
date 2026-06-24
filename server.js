import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const envPath = fileURLToPath(new URL('.env', import.meta.url))
dotenv.config({ path: envPath, override: true })

const app = express()
app.use(cors())
app.use(express.json())

const verificationCodes = new Map()
console.log('SMTP configured:', Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS))

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendCodeEmail(email, code) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM || 'no-reply@local.dev'

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Tu código de acceso',
        text: `Tu código de acceso es ${code}. Válido por 5 minutos.`,
        html: `<p>Tu código de acceso es <strong>${code}</strong>.</p><p>Válido por 5 minutos.</p>`,
      })

      return { sent: true, via: 'nodemailer' }
    } catch (error) {
      console.error('SMTP send error:', error)
      return { sent: false, via: 'error', error: error.message }
    }
  }

  console.warn('SMTP not configured. Returning demo code in the response.')
  return { sent: false, via: 'demo' }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/login/request', async (req, res) => {
  const { email } = req.body || {}

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Ingresa un correo válido.' })
  }

  const normalizedEmail = email.toLowerCase()
  const code = generateCode()
  verificationCodes.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  const result = await sendCodeEmail(normalizedEmail, code)

  console.log(`Código generado para ${normalizedEmail}: ${code}`)

  return res.json({
    message: result.sent
      ? `Se envió un código a ${normalizedEmail}.`
      : result.via === 'error'
        ? `No se pudo enviar el correo: ${result.error}`
        : `Se generó un código de prueba para ${normalizedEmail}.`,
    debugCode: result.sent || result.via === 'error' ? undefined : code,
  })
})

app.post('/api/login/verify', (req, res) => {
  const { email, code } = req.body || {}

  if (!email || !code) {
    return res.status(400).json({ message: 'Faltan datos para verificar.' })
  }

  const normalizedEmail = email.toLowerCase()
  const stored = verificationCodes.get(normalizedEmail)

  if (!stored) {
    return res.status(400).json({ message: 'No hay un código activo para este correo.' })
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(normalizedEmail)
    return res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' })
  }

  if (stored.code !== String(code)) {
    return res.status(400).json({ message: 'El código es incorrecto.' })
  }

  verificationCodes.delete(normalizedEmail)
  return res.json({ success: true, message: 'Inicio de sesión exitoso.' })
})

app.listen(3001, () => {
  console.log('Backend listening on http://localhost:3001')
})
