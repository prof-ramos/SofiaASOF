import { createClient } from '@supabase/supabase-js'

const isBuild = process.env.npm_lifecycle_event === 'build'

if (
  !isBuild &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  throw new Error('Configuração do Servidor Incompleta: Variáveis do Supabase ausentes.')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Client público — usado no frontend (somente leitura)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client com service role — usado apenas em Server Actions e scripts de ingestão
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})
