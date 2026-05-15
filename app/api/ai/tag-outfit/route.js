// app/api/ai/tag-outfit/route.js
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { groqJSON } from '@/lib/ai/groq'
import { promptTagOutfit } from '@/lib/ai/prompts'
import { normalizarOutfit, OUTFIT_SELECT_FRAGMENT } from '@/lib/outfitAdapter'
import crypto from 'crypto'

function hashOutfit(row) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify({
      top_id: row.top_id, bottom_id: row.bottom_id,
      shoes_id: row.shoes_id, outerwear_id: row.outerwear_id, score: row.score,
    }))
    .digest('hex')
    .slice(0, 12)
}

export async function POST(request) {
  try {
    const { outfit_id, user_id, force = false } = await request.json()
    if (!outfit_id || !user_id) {
      return NextResponse.json({ error: 'outfit_id y user_id requeridos' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data: outfitRow } = await supabase
      .from('outfits')
      .select(`*, ${OUTFIT_SELECT_FRAGMENT}`)
      .eq('id', outfit_id)
      .eq('user_id', user_id)
      .single()

    if (!outfitRow) return NextResponse.json({ error: 'Outfit no encontrado' }, { status: 404 })

    const outfit = normalizarOutfit(outfitRow)
    const hash   = hashOutfit(outfitRow)

    // Cache check
    if (!force) {
      const { data: cached } = await supabase
        .from('outfit_ai_tags')
        .select('*')
        .eq('outfit_id', outfit_id)
        .eq('user_id', user_id)
        .eq('outfit_hash', hash)
        .maybeSingle()

      if (cached) return NextResponse.json({ ...cached, cached: true })
    }

    // Groq call — usar modelo rápido para tagging
    const { messages } = promptTagOutfit(outfit)
    const { data: tags, tokens, model } = await groqJSON({
      messages,
      model:       process.env.GROQ_MODEL_FAST ?? 'llama-3.1-8b-instant',
      maxTokens:   280,
      temperature: 0.3,
    })

    const { data: saved } = await supabase
      .from('outfit_ai_tags')
      .upsert([{
        outfit_id,
        user_id,
        vibe:        tags.vibe        ?? null,
        energy:      tags.energy      ?? null,
        mood:        tags.mood        ?? null,
        aesthetic:   tags.aesthetic   ?? [],
        occasion:    tags.occasion    ?? [],
        descriptors: tags.descriptors ?? [],
        outfit_hash: hash,
        model_used:  model,
        tokens_used: tokens,
        updated_at:  new Date().toISOString(),
      }], { onConflict: 'outfit_id,user_id' })
      .select()
      .single()

    return NextResponse.json({ ...saved, cached: false })

  } catch (err) {
    console.error('[tag-outfit]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}