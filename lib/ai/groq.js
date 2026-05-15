// lib/ai/groq.js
// ============================================================
// Cliente Groq API (OpenAI-compatible)
// Base URL: https://api.groq.com/openai/v1/chat/completions
// Auth: Bearer GROQ_API_KEY
//
// Modelos disponibles:
//   llama-3.3-70b-versatile   ← complejo, análisis de estilo
//   llama-3.1-8b-instant      ← rápido, tagging, scoring
//   deepseek-r1-distill-llama-70b ← razonamiento extendido
//
// IMPORTANTE Groq JSON mode:
//   response_format: { type: 'json_object' } requiere que
//   la palabra "json" aparezca en system o user message.
//   Los helpers lo inyectan automáticamente.
// ============================================================

const GROQ_BASE_URL = process.env.GROQ_API_BASE_URL ?? 'https://api.groq.com/openai/v1'
const GROQ_API_KEY  = process.env.GROQ_API_KEY
const MAX_RPM       = parseInt(process.env.GROQ_MAX_RPM ?? '28', 10)
const WINDOW_MS     = 60_000

// ── Rate limiter in-memory ────────────────────────────────────
const _log = []

function _isRateLimited() {
  const now   = Date.now()
  const cutoff = now - WINDOW_MS
  while (_log.length && _log[0] < cutoff) _log.shift()
  return _log.length >= MAX_RPM
}

function _recordRequest() {
  _log.push(Date.now())
}

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Core HTTP request ─────────────────────────────────────────
async function _groqRequest(payload, retries = 3) {
  if (!GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY no está configurada. Agrégala en Settings → Secrets o en .env.local'
    )
  }

  let lastError

  for (let attempt = 0; attempt < retries; attempt++) {
    // Esperar si estamos cerca del límite
    if (_isRateLimited()) {
      await _sleep(Math.ceil(WINDOW_MS / MAX_RPM))
    }

    try {
      _recordRequest()

      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payload),
        // Groq es muy rápido; 20s es suficiente timeout
        signal: AbortSignal.timeout(20_000),
      })

      // 429 → Rate limited por Groq
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') ?? '10', 10)
        await _sleep(retryAfter * 1000)
        continue
      }

      // 5xx → Error del servidor, reintentar con backoff
      if (res.status >= 500) {
        await _sleep(Math.pow(2, attempt) * 600)
        continue
      }

      // 4xx → Error del cliente, no reintentar
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg  = body?.error?.message ?? `Groq error ${res.status}`
        throw new Error(msg)
      }

      return await res.json()

    } catch (err) {
      // AbortError (timeout) o error de red → reintentar
      if (err.name === 'AbortError' || err.name === 'TypeError') {
        lastError = new Error(`Groq timeout / red (intento ${attempt + 1})`)
        await _sleep(Math.pow(2, attempt) * 400)
        continue
      }
      // Error de negocio → propagar inmediatamente
      throw err
    }
  }

  throw lastError ?? new Error('Groq: máximo de reintentos alcanzado')
}

// ── API pública ───────────────────────────────────────────────

/**
 * Llama a Groq chat completions.
 *
 * @param {Object}   opts
 * @param {Array}    opts.messages
 * @param {string}   [opts.model]       - default: GROQ_MODEL env
 * @param {number}   [opts.maxTokens]   - default: 600
 * @param {number}   [opts.temperature] - default: 0.7
 * @param {boolean}  [opts.jsonMode]    - fuerza JSON válido en respuesta
 *
 * @returns {Promise<{ content: string, tokens: number, model: string }>}
 */
export async function groqChat({
  messages,
  model       = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  maxTokens   = 600,
  temperature = 0.7,
  jsonMode    = false,
}) {
  const payload = {
    model,
    messages,
    max_tokens:  maxTokens,
    temperature: Math.max(0, Math.min(2, temperature)),
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  }

  const result = await _groqRequest(payload)

  return {
    content: result.choices?.[0]?.message?.content ?? '',
    tokens:  result.usage?.total_tokens ?? 0,
    model:   result.model ?? model,
  }
}

/**
 * Llama a Groq y parsea la respuesta como JSON.
 * Inyecta automáticamente la instrucción "json" en el system message
 * para cumplir el requisito de Groq JSON mode.
 *
 * @param {Object} opts  - mismos parámetros que groqChat + schema opcional
 * @returns {Promise<{ data: Object, tokens: number, model: string }>}
 */
export async function groqJSON({
  messages,
  schema,
  model       = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  maxTokens   = 600,
  temperature = 0.3,
}) {
  // Groq requiere "json" en el mensaje para activar json_object mode
  const systemInjection = {
    role:    'system',
    content: `Responde EXCLUSIVAMENTE con JSON válido (sin markdown, sin texto extra).${
      schema ? ` Schema requerido: ${JSON.stringify(schema)}` : ''
    }`,
  }

  // Insertar al inicio; si ya hay un system message, fusionar
  const firstMsg  = messages[0]
  let finalMessages

  if (firstMsg?.role === 'system') {
    finalMessages = [
      { role: 'system', content: `${systemInjection.content}\n\n${firstMsg.content}` },
      ...messages.slice(1),
    ]
  } else {
    finalMessages = [systemInjection, ...messages]
  }

  const { content, tokens, model: usedModel } = await groqChat({
    messages:    finalMessages,
    model,
    maxTokens,
    temperature,
    jsonMode:    true,
  })

  // Parse con fallback
  try {
    return { data: JSON.parse(content), tokens, model: usedModel }
  } catch {
    // Extraer bloque JSON si el modelo añadió texto extra
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return { data: JSON.parse(match[0]), tokens, model: usedModel }
      } catch {}
    }
    throw new Error(
      `Groq no devolvió JSON válido. Respuesta: ${content.slice(0, 300)}`
    )
  }
}

/**
 * Health check — verifica que la API key funciona.
 */
export async function groqHealthCheck() {
  try {
    const { content } = await groqChat({
      messages:  [{ role: 'user', content: 'Di "OK"' }],
      maxTokens: 5,
      model:     process.env.GROQ_MODEL_FAST ?? 'llama-3.1-8b-instant',
    })
    return { ok: true, response: content.trim() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// Aliases para retrocompatibilidad con código que importara los nombres viejos
export { groqChat as grokChat, groqJSON as grokJSON, groqHealthCheck as grokHealthCheck }