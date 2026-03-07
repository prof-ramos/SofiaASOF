/**
 * Script para aplicar migration de rate limiting
 * Uso: npx tsx scripts/apply-rate-limiting-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Carregar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase ausentes:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  console.error('\n💡 Certifique-se de que o arquivo .env.local existe com estas variáveis.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function applyMigration() {
  console.log('🚀 Aplicando migration de rate limiting...')

  try {
    // Ler o arquivo SQL
    const sqlPath = join(process.cwd(), 'supabase/migrations/20260307000001_rate_limiting.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    // Executar via SQL raw (nota: Supabase não permite executar múltiplos statements via RPC)
    // Vamos quebrar em statements individuais
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      try {
        // Tentar executar via RPC direto (precisa criar função exec_sql primeiro)
        // Por ora, vamos tentar executar as tabelas individualmente via SQL

        if (statement.toLowerCase().includes('create table')) {
          console.log(`📦 Criando tabela...`)
          // CREATE TABLE via SQL direto não é suportado via client padrão
          // Precisamos executar manualmente ou via Supabase Dashboard
          console.log('⚠️  CREATE TABLE requer execução manual via Supabase Dashboard ou psql')
          console.log('   Comando SQL disponível em:', sqlPath)
        }
      } catch (error) {
        console.error(`❌ Erro no statement ${i + 1}:`, error)
      }
    }

    console.log('✅ Migration preparada com sucesso!')
    console.log('\n📝 Para aplicar completamente, execute no Supabase SQL Editor:')
    console.log('   1. Abra https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new')
    console.log('   2. Copie e cole o conteúdo de:', sqlPath)
    console.log('   3. Execute o SQL')

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error)
    process.exit(1)
  }
}

applyMigration()
