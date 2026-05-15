// app/api/ai/analyze-style/route.js
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { groqJSON } from '@/lib/ai/groq'
import { promptAnalyzeStyle } from '@/lib/ai/prompts'

const CACHE_TTL_HOURS = 24

export async function POST(request) {
  try {
    const { user_id, force = false } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

    const supabase = await createServerSupabaseClient()

    // ── Cache check ─────────────────────────────────────────
    if (!force) {
      const { data: cached } = await supabase
        .from('style_insights')
        .select('*')
        .eq('user_id', user_id)
        .eq('insight_type', 'full_analysis')
        .gt('expires_at', new Date().toISOString())
        .eq('is_stale', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached) {
        return NextResponse.json({ ...cached.content, cached: true })
      }
    }

    // ── Cargar datos ─────────────────────────────────────────
    const [profileRes, outfitsRes, feedbackRes] = await Promise.all([
      supabase.from('user_style_profiles').select('*').eq('user_id', user_id).maybeSingle(),
      supabase.from('outfits')
        .select('id, score, source, seasons, nivel_termico, top_id, bottom_id, shoes_id, outerwear_id')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('outfit_feedback')
        .select('action, weight')
        .eq('user_id', user_id)
        .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
    ])

    const profile = profileRes.data
    const outfits = outfitsRes.data ?? []

    const feedbackSummary = (feedbackRes.data ?? []).reduce(
      (acc, r) => {
        if (r.action === 'like')    acc.likes++
        if (r.action === 'save')    acc.saves++
        if (r.action === 'dislike') acc.dislikes++
        return acc
      },
      { likes: 0, saves: 0, dislikes: 0 }
    )

    // ── Groq call ───────────────────────────────────────────
    const { messages, schema } = promptAnalyzeStyle({
      profile:       profile ?? {},
      recentOutfits: outfits,
      feedbackSummary,
    })

    const { data: analysis, tokens, model } = await groqJSON({
      messages,
      schema,
      model:      process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      maxTokens:  700,
      temperature: 0.5,
    })

    // ── Guardar en cache ─────────────────────────────────────
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3_600_000)

    await Promise.all([
      supabase.from('style_insights').insert([{
        user_id,
        insight_type: 'full_analysis',
        content:      analysis,
        model_used:   model,
        tokens_used:  tokens,
        expires_at:   expiresAt.toISOString(),
      }]),
      supabase.from('user_style_profiles').update({
        vibes:                 analysis.vibes    ?? [],
        aesthetic_tags:        analysis.aesthetic ?? [],
        style_summary:         analysis.summary,
        last_insight_at:       new Date().toISOString(),
        needs_insight_refresh: false,
      }).eq('user_id', user_id),
    ])

    return NextResponse.json({ ...analysis, cached: false, tokens_used: tokens })

  } catch (err) {
    console.error('[analyze-style]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}