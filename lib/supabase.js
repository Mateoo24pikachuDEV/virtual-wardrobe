// lib/supabase.js
import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase para uso en el NAVEGADOR.
 * Úsalo en Client Components ('use client') y hooks.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Instancia singleton para hooks y componentes cliente
const supabase = createClient()
export default supabase