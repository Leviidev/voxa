import { Router } from 'express'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { signToken, signTempToken, verifyTempToken, requireAuth } from '../middleware/auth.js'
import { parseDevice, parseIp } from '../utils.js'
import {
  getUserWithSecurity,
  setTotpSecret,
  enableTotp,
  disableTotp,
  createBackupCodes,
  verifyAndConsumeBackupCode,
  getPasskeys,
  savePasskey,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  removePasskey,
  getUserPasskeyCredentialIds,
  saveChallenge,
  getAndDeleteChallenge,
  getUserById,
  recordLoginHistory,
  getLoginHistory,
} from '../db.js'

const router = Router()

function getOriginAndRpId(req) {
  const origin = req.headers.origin || `https://${req.headers.host}`
  let rpId
  try { rpId = new URL(origin).hostname } catch { rpId = 'localhost' }
  return { origin, rpId }
}

// ─── 2FA Status ───────────────────────────────────────────────────────────────

router.get('/2fa/status', requireAuth, async (req, res) => {
  try {
    const user = await getUserWithSecurity(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ totpEnabled: user.totpEnabled })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── 2FA Setup ────────────────────────────────────────────────────────────────

router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const user = await getUserWithSecurity(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.totpEnabled) return res.status(400).json({ error: '2FA is already enabled' })

    const secret = generateSecret()
    await setTotpSecret(req.user.id, secret)
    const otpauth = generateURI({ strategy: 'totp', issuer: 'Voxa', label: user.email, secret })
    const qrCode = await QRCode.toDataURL(otpauth)
    res.json({ secret, qrCode })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── 2FA Enable ───────────────────────────────────────────────────────────────

router.post('/2fa/enable', requireAuth, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code is required' })

    const user = await getUserWithSecurity(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.totpEnabled) return res.status(400).json({ error: '2FA is already enabled' })
    if (!user.totpSecret) return res.status(400).json({ error: 'Run setup first' })

    const result = verifySync({ token: code.replace(/\s/g, ''), secret: user.totpSecret })
    if (!result?.valid) return res.status(400).json({ error: 'Invalid code — try again.' })

    const plainCodes = Array.from({ length: 8 }, () =>
      `${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`
    )
    const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 10)))
    await enableTotp(req.user.id)
    await createBackupCodes(req.user.id, hashedCodes)
    res.json({ ok: true, backupCodes: plainCodes })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── 2FA Disable ─────────────────────────────────────────────────────────────

router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code is required' })

    const user = await getUserWithSecurity(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!user.totpEnabled) return res.status(400).json({ error: '2FA is not enabled' })

    const clean = code.replace(/\s/g, '')
    const totpResult = verifySync({ token: clean, secret: user.totpSecret })
    const totpOk = totpResult?.valid === true
    const backupOk = totpOk ? false : await verifyAndConsumeBackupCode(req.user.id, clean)
    if (!totpOk && !backupOk) return res.status(400).json({ error: 'Invalid code' })

    await disableTotp(req.user.id)
    res.json({ ok: true })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── 2FA Verify (during login) ────────────────────────────────────────────────

router.post('/2fa/verify', async (req, res) => {
  try {
    const { tempToken, code } = req.body
    if (!tempToken || !code) return res.status(400).json({ error: 'tempToken and code are required' })

    let payload
    try { payload = verifyTempToken(tempToken) } catch {
      return res.status(401).json({ error: 'Session expired — please log in again.' })
    }

    const user = await getUserWithSecurity(payload.id)
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ error: 'Invalid session' })
    }

    const clean = code.replace(/\s/g, '')
    const totpResult = verifySync({ token: clean, secret: user.totpSecret })
    const totpOk = totpResult?.valid === true
    const backupOk = totpOk ? false : await verifyAndConsumeBackupCode(payload.id, clean)
    if (!totpOk && !backupOk) return res.status(400).json({ error: 'Invalid code' })

    const token = signToken({ id: user.id })
    const pub = await getUserById(user.id)
    recordLoginHistory(user.id, {
      method: '2fa',
      ip: parseIp(req),
      device: parseDevice(req.headers['user-agent']),
    }).catch(() => {})
    res.json({ token, user: pub })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Login history ────────────────────────────────────────────────────────────

router.get('/login-history', requireAuth, async (req, res) => {
  try {
    res.json(await getLoginHistory(req.user.id, 20))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Passkey — list ───────────────────────────────────────────────────────────

router.get('/passkey/list', requireAuth, async (req, res) => {
  try {
    res.json(await getPasskeys(req.user.id))
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Passkey — register options ───────────────────────────────────────────────

router.post('/passkey/register-options', requireAuth, async (req, res) => {
  try {
    const { rpId } = getOriginAndRpId(req)
    const user = await getUserById(req.user.id)
    const existingIds = await getUserPasskeyCredentialIds(req.user.id)

    const options = await generateRegistrationOptions({
      rpName: 'Voxa',
      rpID: rpId,
      userName: user.username,
      userDisplayName: user.displayName || user.username,
      userID: Buffer.from(String(req.user.id)),
      excludeCredentials: existingIds.map(id => ({ id, type: 'public-key' })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      attestationType: 'none',
    })

    const sessionKey = randomBytes(16).toString('hex')
    await saveChallenge(sessionKey, options.challenge, 'registration', req.user.id)
    res.json({ options, sessionKey })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Passkey — register complete ─────────────────────────────────────────────

router.post('/passkey/register', requireAuth, async (req, res) => {
  try {
    const { response, sessionKey, deviceName } = req.body
    const { origin, rpId } = getOriginAndRpId(req)

    const challengeRow = await getAndDeleteChallenge(sessionKey)
    if (!challengeRow || challengeRow.user_id !== req.user.id) {
      return res.status(400).json({ error: 'Invalid or expired session' })
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey registration failed' })
    }

    const { credential } = verification.registrationInfo
    const row = await savePasskey(req.user.id, {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      deviceName: deviceName || 'Passkey',
      transports: JSON.stringify(credential.transports || []),
    })
    res.json({ ok: true, passkey: { id: row.id, deviceName: row.device_name, createdAt: row.created_at } })
  } catch (err) {
    console.error('Passkey register error:', err)
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ─── Passkey — authenticate options ──────────────────────────────────────────

router.post('/passkey/authenticate-options', async (req, res) => {
  try {
    const { rpId } = getOriginAndRpId(req)
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: 'preferred',
    })
    const sessionKey = randomBytes(16).toString('hex')
    await saveChallenge(sessionKey, options.challenge, 'authentication', null)
    res.json({ options, sessionKey })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

// ─── Passkey — authenticate complete ─────────────────────────────────────────

router.post('/passkey/authenticate', async (req, res) => {
  try {
    const { response, sessionKey } = req.body
    const { origin, rpId } = getOriginAndRpId(req)

    const challengeRow = await getAndDeleteChallenge(sessionKey)
    if (!challengeRow) return res.status(400).json({ error: 'Invalid or expired session' })

    const passkey = await getPasskeyByCredentialId(response.id)
    if (!passkey) return res.status(400).json({ error: 'Passkey not recognised' })

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: Number(passkey.counter),
        transports: JSON.parse(passkey.transports || '[]'),
      },
    })

    if (!verification.verified) return res.status(400).json({ error: 'Passkey verification failed' })

    await updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter)
    const token = signToken({ id: passkey.user_id })
    const user = await getUserById(passkey.user_id)
    recordLoginHistory(passkey.user_id, {
      method: 'passkey',
      ip: parseIp(req),
      device: parseDevice(req.headers['user-agent']),
    }).catch(() => {})
    res.json({ token, user })
  } catch (err) {
    console.error('Passkey auth error:', err)
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// ─── Passkey — delete ─────────────────────────────────────────────────────────

router.delete('/passkey/:id', requireAuth, async (req, res) => {
  try {
    await removePasskey(req.user.id, parseInt(req.params.id))
    res.json({ ok: true })
  } catch (err) { res.status(err.status ?? 500).json({ error: err.message }) }
})

export default router
