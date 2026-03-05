import { supabase } from '@/lib/supabase'

interface Note {
  id: string
}

export default async function TestConnection() {
  // Simple auth check - in production, require authenticated user
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground">Esta página é apenas para desenvolvimento.</p>
        </div>
      )
    }
  }

  let status = 'Iniciando teste...'
  let errorMsg = ''
  let result: Note[] | null = null

  try {
    // Tenta uma consulta simples para validar a conexão
    const { data, error } = await supabase.from('notes').select('id').limit(1)

    if (error) {
      status = 'Conectado ao Supabase, mas erro na consulta (tabela "notes" existe?)'
      errorMsg = JSON.stringify(error, null, 2)
    } else {
      status = 'Conexão estabelecida com sucesso!'
      result = data
    }
  } catch (e: unknown) {
    status = 'Falha crítica na conexão'
    errorMsg = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="p-8 font-sans max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teste de Conectividade Supabase</h1>

      <div
        className={`p-4 rounded-lg mb-4 ${errorMsg ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
      >
        <p className="font-semibold">{status}</p>
      </div>

      {errorMsg && (
        <div className="bg-red-100 p-4 rounded-lg overflow-auto max-h-60 mt-4">
          <p className="font-mono text-sm whitespace-pre-wrap">{errorMsg}</p>
        </div>
      )}

      {result && (
        <div className="bg-emerald-100 p-4 rounded-lg mt-4">
          <p className="text-sm font-semibold">
            Consulta executada com sucesso. {result.length > 0 ? `${result.length} registro(s) encontrado(s).` : 'Nenhum registro encontrado.'}
          </p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t text-sm text-gray-500">
        <p>
          Este teste valida apenas a conectividade básica com a tabela <code>notes</code>.
        </p>
        <p>
          Para o chatbot funcionar, lembre-se de executar o <code>supabase/schema.sql</code> e o
          script de ingestão.
        </p>
      </div>
    </div>
  )
}
