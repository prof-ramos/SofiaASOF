#!/usr/bin/env bash
# =============================================================================
# SOFIA ASOF — Script de setup completo via CLI
# =============================================================================
# Pré-requisitos:
#   - Node.js 18+
#   - Supabase CLI  : npm i -g supabase
#   - Vercel CLI    : npm i -g vercel
#   - .env.local    : copiado e preenchido a partir de .env.local.example
#
# Uso:
#   bash scripts/setup.sh
# =============================================================================

set -euo pipefail

# ── Cores para output ─────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ ${NC}$*"; }
success() { echo -e "${GREEN}✓ ${NC}$*"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$*"; }
error()   { echo -e "${RED}✗ ${NC}$*"; exit 1; }
step()    { echo -e "\n${GREEN}══ $* ${NC}"; }

# ── Verificação de pré-requisitos ─────────────────────────────────────────────
step "Verificando pré-requisitos"

command -v node   >/dev/null 2>&1 || error "Node.js não encontrado. Instale em https://nodejs.org"
command -v npm    >/dev/null 2>&1 || error "npm não encontrado."
command -v supabase >/dev/null 2>&1 || error "Supabase CLI não encontrado. Execute: npm i -g supabase"
command -v vercel >/dev/null 2>&1  || error "Vercel CLI não encontrado. Execute: npm i -g vercel"

success "Node.js $(node -v), npm $(npm -v), Supabase CLI $(supabase --version), Vercel CLI $(vercel --version)"

# ── Verificar .env.local ──────────────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  error ".env.local não encontrado. Copie .env.local.example e preencha as variáveis:\n   cp .env.local.example .env.local"
fi

# Carregar variáveis do .env.local
set -a
# shellcheck disable=SC1091
source .env.local
set +a

# Variáveis obrigatórias
for VAR in OPENAI_API_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [ -z "${!VAR:-}" ]; then
    error "Variável $VAR não definida em .env.local"
  fi
done

success ".env.local carregado e validado"

# ── Instalar dependências npm ─────────────────────────────────────────────────
step "Instalando dependências npm"
npm install
success "Dependências instaladas"

# ── Supabase: autenticação e link ─────────────────────────────────────────────
step "Configurando Supabase"

# Extrair project-ref da URL (ex.: https://abcxyz.supabase.co → abcxyz)
SUPABASE_PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | cut -d'.' -f1)

info "Project ref detectado: $SUPABASE_PROJECT_REF"
info "Autenticando no Supabase (será solicitado token ou browser)..."

supabase login

info "Vinculando projeto local ao projeto remoto..."
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password ""

# ── Supabase: aplicar migrações ───────────────────────────────────────────────
step "Aplicando migrações do banco de dados"

info "Executando: supabase db push"
supabase db push

success "Banco de dados configurado (pgvector + tabelas + RLS + match_documents)"

# ── Vercel: autenticação e link ───────────────────────────────────────────────
step "Configurando Vercel"

info "Autenticando no Vercel..."
vercel login

info "Vinculando projeto ao Vercel (responda às perguntas interativas)..."
vercel link

# ── Vercel: configurar variáveis de ambiente ──────────────────────────────────
step "Configurando variáveis de ambiente no Vercel"

# Array de variáveis a configurar
declare -A ENV_VARS=(
  ["OPENAI_API_KEY"]="$OPENAI_API_KEY"
  ["NEXT_PUBLIC_SUPABASE_URL"]="$NEXT_PUBLIC_SUPABASE_URL"
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ["SUPABASE_SERVICE_ROLE_KEY"]="$SUPABASE_SERVICE_ROLE_KEY"
)

# Variável opcional
if [ -n "${PORTAL_TRANSPARENCIA_API_KEY:-}" ]; then
  ENV_VARS["PORTAL_TRANSPARENCIA_API_KEY"]="$PORTAL_TRANSPARENCIA_API_KEY"
fi

for VAR_NAME in "${!ENV_VARS[@]}"; do
  VAR_VALUE="${ENV_VARS[$VAR_NAME]}"
  info "Adicionando $VAR_NAME aos ambientes production, preview, development..."

  # Adiciona a variável para todos os ambientes de uma vez
  echo "$VAR_VALUE" | vercel env add "$VAR_NAME" production  --force 2>/dev/null || true
  echo "$VAR_VALUE" | vercel env add "$VAR_NAME" preview     --force 2>/dev/null || true
  echo "$VAR_VALUE" | vercel env add "$VAR_NAME" development --force 2>/dev/null || true

  success "$VAR_NAME configurada"
done

# ── Vercel: deploy em produção ────────────────────────────────────────────────
step "Deploy em produção"

info "Iniciando deploy... (aguarde o build)"
vercel --prod

# ── Ingestão de documentos ────────────────────────────────────────────────────
step "Ingestão da base de conhecimento"

if [ -d "docs" ] && [ "$(ls -A docs/*.txt 2>/dev/null | head -1)" ]; then
  info "Documentos encontrados em /docs. Iniciando ingestão..."
  npm run ingest
  success "Base de conhecimento atualizada"
else
  warn "Nenhum documento .txt encontrado em /docs."
  warn "Coloque os arquivos de legislação em /docs/ e execute: npm run ingest"
fi

# ── Conclusão ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SOFIA configurada e implantada com sucesso!           ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
info "Próximos passos:"
echo "  1. Acesse a URL exibida pelo Vercel acima para verificar o deploy"
echo "  2. Se ainda não fez, coloque os documentos em /docs/ e execute:"
echo "     npm run ingest"
echo "  3. Para novas migrações:"
echo "     npm run db:push"
echo "  4. Para novo deploy de preview:"
echo "     npm run deploy:prev"
echo ""
