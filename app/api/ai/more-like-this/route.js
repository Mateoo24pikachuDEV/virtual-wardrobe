// app/api/ai/more-like-this/route.js
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { normalizarOutfit, OUTFIT_SELECT_FRAGMENT } from '@/lib/outfitAdapter'
import { findSimilarOutfits } from '@/lib/personalization/similarityEngine'

export async function POST(request) {
  try {
    const { outfit_id, user_id, top_n = 6 } = await request.json()
    if (!outfit_id || !user_id) {
      return NextResponse.json({ error: 'outfit_id y user_id requeridos' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const [targetRes, candidatesRes] = await Promise.all([
      supabase.from('outfits')
        .select(`*, ${OUTFIT_SELECT_FRAGMENT}`)
        .eq('id', outfit_id)
        .eq('user_id', user_id)
        .single(),
      supabase.from('outfits')
        .select(`*, ${OUTFIT_SELECT_FRAGMENT}, outfit_ai_tags!left(vibe,energy,mood,aesthetic,occasion,descriptors)`)
        .eq('user_id', user_id)
        .neq('id', outfit_id)
        .limit(100),
    ])

    if (!targetRes.data) {
      return NextResponse.json({ error: 'Outfit no encontrado' }, { status: 404 })
    }

    const target     = normalizarOutfit(targetRes.data)
    const candidates = (candidatesRes.data ?? []).map((row) => ({
      ...normalizarOutfit(row),
      ai_tags: row.outfit_ai_tags?.[0] ?? null,
    }))

    const results = findSimilarOutfits(target, candidates, { topN: top_n })

    return NextResponse.json({
      target_id:            outfit_id,
      results:              results.map((r) => ({ outfit: r.outfit, similarity: r.similarity })),
      candidates_evaluated: candidates.length,
    })

  } catch (err) {
    console.error('[more-like-this]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}