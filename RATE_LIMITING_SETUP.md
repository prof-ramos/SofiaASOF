# 🚀 Setup de Rate Limiting com Supabase

## Instruções Manuais (Supabase não está linkado localmente)

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. **Abra o Supabase SQL Editor:**
   ```
   https://app.supabase.com/project/[SEU_PROJECT_ID]/sql/new
   ```

2. **Copie e cole o SQL:**
   ```bash
   cat supabase/migrations/20260307000001_rate_limiting.sql
   ```

3. **Execute o SQL** (clique em "Run")

4. **Verifique a criação:**
   - Tabela `rate_limit_entries` criada
   - Índices criados
   - Função `cleanup_old_rate_limit_entries()` criada

### Opção 2: Via psql (se tiver acesso)

```bash
# Conectar ao Supabase
psql $DATABASE_URL

# Executar migration
\i supabase/migrations/20260307000001_rate_limiting.sql
```

### Opção 3: Via Supabase CLI (requer link local)

```bash
# Link do projeto (se ainda não feito)
supabase link --project-ref [SEU_PROJECT_ID]

# Aplicar migration
supabase db push
```

---

## ✅ Validação

Depois de aplicar a migration, valide com:

```bash
# Via SQL Editor, execute:
SELECT COUNT(*) FROM rate_limit_entries;
SELECT * FROM rate_limit_entries LIMIT 5;
```

---

## 🔧 Integração com o Código

A migração já está pronta! O código em `lib/rate-limit-supabase.ts` já está implementado e pode ser usado assim que a migration for aplicada.

**Próximos passos:**
1. Aplicar a migration manualmente (instruções acima)
2. Atualizar `route.ts` para usar `rateLimitSupabase()`
3. Testar com a API
