/**
 * SOFIA — Script de Ingestão de Documentos
 *
 * Uso:
 *   npm run ingest                     # processa todos os documentos em /docs
 *   npm run ingest -- --file docs/lei.txt  # processa um arquivo específico
 *
 * Requisitos:
 *   - Variáveis de ambiente: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Schema Supabase aplicado (ver supabase/schema.sql)
 *   - Documentos em texto plano ou PDF convertido em ./docs/
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ── Configuração ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const CHUNK_SIZE = 1000      // caracteres por chunk
const CHUNK_OVERLAP = 200    // sobreposição entre chunks
const BATCH_SIZE = 10        // embeddings por requisição

// ── Clientes ────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Chunk {
  content: string
  metadata: {
    source: string
    title: string
    chunkIndex: number
    totalChunks: number
  }
}

// ── Funções auxiliares ───────────────────────────────────────────────────────

function splitIntoChunks(text: string, source: string, title: string): Chunk[] {
  const chunks: Chunk[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    const content = text.slice(start, end).trim()

    if (content.length > 50) {  // ignora chunks muito pequenos
      chunks.push({
        content,
        metadata: { source, title, chunkIndex: chunks.length, totalChunks: 0 },
      })
    }

    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  // Atualizar totalChunks após calcular todos
  chunks.forEach(c => { c.metadata.totalChunks = chunks.length })

  return chunks
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.replace(/\n/g, ' ')),
  })
  return response.data.map(d => d.embedding)
}

async function upsertChunks(chunks: Chunk[], embeddings: number[][]): Promise<void> {
  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: embeddings[i],
  }))

  const { error } = await supabase.from('documents').insert(rows)
  if (error) throw new Error(`Erro ao inserir chunks: ${error.message}`)
}

// ── Processamento de documentos ──────────────────────────────────────────────

interface DocumentConfig {
  file: string
  title: string
}

const DOCUMENTS: DocumentConfig[] = [
  { file: 'lei-11440-2006.txt', title: 'Lei nº 11.440/2006 — Serviço Exterior Brasileiro' },
  { file: 'decreto-9817-2019.txt', title: 'Decreto nº 9.817/2019 — Regulamenta a Lei nº 11.440/2006' },
  { file: 'lei-8112-1990.txt', title: 'Lei nº 8.112/1990 — Regime Jurídico dos Servidores Públicos' },
  { file: 'lei-8027-1990.txt', title: 'Lei nº 8.027/1990 — Normas de conduta dos servidores' },
  { file: 'decreto-1171-1994.txt', title: 'Decreto nº 1.171/1994 — Código de Ética do Servidor Público' },
  { file: 'decreto-7133-2010.txt', title: 'Decreto nº 7.133/2010 — Avaliação de desempenho e gratificações' },
  { file: 'lei-12527-2011.txt', title: 'Lei nº 12.527/2011 — Lei de Acesso à Informação' },
  { file: 'decreto-7724-2012.txt', title: 'Decreto nº 7.724/2012 — Regulamenta a LAI' },
  { file: 'decreto-6134-2007.txt', title: 'Decreto nº 6.134/2007 — Remuneração no Exterior' },
  { file: 'manual-redacao-itamaraty-2024.txt', title: 'Manual de Redação Oficial e Diplomática do Itamaraty (2024)' },
  { file: 'manual-redacao-presidencia.txt', title: 'Manual de Redação da Presidência da República (3ª ed.)' },
  { file: 'estatuto-asof.txt', title: 'Estatuto da ASOF' },
]

async function processDocument(config: DocumentConfig, docsDir: string): Promise<void> {
  const filePath = path.join(docsDir, config.file)

  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  Arquivo não encontrado: ${config.file} — ignorando.`)
    return
  }

  console.log(`  📄 Processando: ${config.title}`)
  const text = fs.readFileSync(filePath, 'utf-8')
  const chunks = splitIntoChunks(text, config.file, config.title)

  console.log(`     ${chunks.length} chunks gerados`)

  // Processar em lotes
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map(c => c.content)
    const embeddings = await generateEmbeddings(texts)
    await upsertChunks(batch, embeddings)
    process.stdout.write(`     Lote ${Math.ceil((i + 1) / BATCH_SIZE)}/${Math.ceil(chunks.length / BATCH_SIZE)} ✓\r`)
  }

  console.log(`     ✅ Concluído: ${chunks.length} chunks inseridos`)
}

// ── Entrada principal ────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 SOFIA — Pipeline de Ingestão de Documentos')
  console.log('═'.repeat(50))

  // Validar variáveis de ambiente
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
    console.error('❌ Variáveis de ambiente ausentes. Verifique .env.local')
    process.exit(1)
  }

  const docsDir = path.join(process.cwd(), 'docs')

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
    console.log(`📁 Diretório criado: ${docsDir}`)
    console.log('   Coloque os documentos .txt neste diretório e execute novamente.')
    process.exit(0)
  }

  // Verificar argumento --file para processar arquivo específico
  const fileArg = process.argv.find(a => a.startsWith('--file='))
  if (fileArg) {
    const filePath = fileArg.replace('--file=', '')
    const fileName = path.basename(filePath)
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/-/g, ' ')
    await processDocument({ file: fileName, title }, path.dirname(filePath))
  } else {
    console.log(`📁 Processando documentos em: ${docsDir}\n`)
    for (const doc of DOCUMENTS) {
      await processDocument(doc, docsDir)
    }
  }

  console.log('\n✅ Ingestão concluída com sucesso!')
  console.log('   A base de conhecimento da SOFIA está atualizada.\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
