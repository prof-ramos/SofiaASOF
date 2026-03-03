# PRD — SOFIA

## Agente de IA da ASOF | Chatbot com RAG

**Versão:** 1.0
**Data:** março de 2026
**Responsável:** Ramos — Coordenador Administrativo da ASOF

---

## 1. VISÃO GERAL

A SOFIA (Suporte Orientado às Funções e Interesses dos Associados) é um agente de inteligência artificial da ASOF, destinado a orientar Oficiais de Chancelaria em atividade e o público geral sobre a carreira de Oficial de Chancelaria do Serviço Exterior Brasileiro.

O projeto está sob responsabilidade de Gabriel Ramos, Coordenador Administrativo da ASOF.

---

## 2. PROBLEMA

Os associados da ASOF e candidatos à carreira não dispõem de canal imediato para esclarecimento de dúvidas sobre legislação, direitos, deveres e procedimentos funcionais. O volume de consultas recorrentes sobrecarrega a Assessoria Jurídica e a Coordenação Administrativa da ASOF.

---

## 3. OBJETIVO

Disponibilizar um chatbot com base de conhecimento especializada (RAG) capaz de responder perguntas sobre a carreira de Oficial de Chancelaria com precisão, citando dispositivos legais e normas do MRE, de forma disponível 24/7.

---

## 4. PÚBLICO-ALVO

| Perfil | Necessidade principal |
|--------|----------------------|
| Oficial de Chancelaria em atividade | Direitos, benefícios, remoção, promoção, licenças |
| Público geral | Informações sobre o concurso e a carreira |

---

## 5. ARQUITETURA TÉCNICA

### 5.1 Stack

| Camada | Tecnologia | Plano | Função |
|--------|------------|-------|--------|
| Frontend + API Routes | Next.js (Vercel) | Free | Interface do chat + endpoints |
| AI SDK | Vercel AI SDK | Free | Streaming, histórico, integração OpenAI |
| LLM | OpenAI API (GPT-4o) | Pay-per-use | Geração de respostas |
| Banco vetorial | Supabase pgvector | Free | Armazenamento e busca de embeddings |
| Armazenamento de docs | Supabase Storage | Free | PDFs e documentos da base de conhecimento |
| Embeddings | OpenAI text-embedding-3-small | Pay-per-use | Geração de vetores para ingestão |
| Dados públicos | MCP Portal da Transparência | Free (API Key) | Consulta a dados do Portal da Transparência |

### 5.2 Fluxo RAG

```
Usuário digita pergunta
        ↓
API Route (Next.js)
        ↓
Gerar embedding da pergunta
        ↓
Busca vetorial no Supabase pgvector
        ↓
Recuperar chunks relevantes
        ↓
Montar prompt com contexto + system prompt da SOFIA
        ↓
Chamar API OpenAI via Vercel AI SDK
        ↓
Streaming da resposta ao usuário
```

### 5.3 Base de Conhecimento (ingestão inicial)

#### Legislação estruturante da carreira

| Norma | Ementa |
|-------|--------|
| Lei nº 11.440/2006 | Institui o Serviço Exterior Brasileiro, disciplina a carreira de Diplomata e a carreira de Oficial de Chancelaria |
| Decreto nº 9.817/2019 | Regulamenta a Lei nº 11.440/2006 (organização, atribuições, progressão, remoção) |
| Lei nº 8.112/1990 | Regime Jurídico dos Servidores Públicos Civis Federais (RJU) |
| Lei nº 8.027/1990 | Normas de conduta dos servidores públicos civis federais |
| Decreto nº 1.171/1994 | Código de Ética Profissional do Servidor Público Civil Federal |
| Decreto nº 7.133/2010 | Critérios e procedimentos de avaliação de desempenho e pagamento de gratificações |
| Lei nº 12.527/2011 | Lei de Acesso à Informação (LAI) |
| Decreto nº 7.724/2012 | Regulamenta a LAI no âmbito do Poder Executivo Federal |

#### Benefícios e remuneração no exterior

| Norma | Ementa |
|-------|--------|
| Lei nº 9.615/1998 e alterações | Adicionais e gratificações das carreiras do Serviço Exterior |
| Decreto nº 6.134/2007 | Regulamenta a remuneração dos servidores do Serviço Exterior em exercício no exterior |
| Portarias MRE vigentes | Tabelas de valores de ajuda de custo, moradia e auxílio-escolaridade no exterior |

#### Processo disciplinar e ética

| Norma | Ementa |
|-------|--------|
| Lei nº 8.112/1990 (Título V) | Regime disciplinar — deveres, proibições, penalidades e PAD |
| Decreto nº 12.002/2024 | Normas para elaboração de atos normativos |

#### Concurso público e ingresso

| Norma | Ementa |
|-------|--------|
| Edital vigente CESPE/CEBRASPE | Concurso público para Oficial de Chancelaria (último edital disponível) |
| Decreto nº 9.817/2019 (Cap. III) | Disposições sobre recrutamento e seleção |

#### Redação oficial e documentação

| Norma | Ementa |
|-------|--------|
| Manual de Redação Oficial e Diplomática do Itamaraty (2024) | Padrões de redação, documentos, vocativos, fechos |
| Manual de Redação da Presidência da República (3ª ed.) | Padrões gerais de comunicação oficial do Poder Executivo |

#### Documentos institucionais da ASOF

- Estatuto da ASOF
- Posicionamentos e notas institucionais publicadas
- Comunicados e circulares relevantes aos associados

### 5.4 MCP Portal da Transparência

Integração com o servidor MCP [`mcp-portal-transparencia-brasil`](https://github.com/dutradotdev/mcp-portal-transparencia) para acesso programático à API do Portal da Transparência do Governo Federal.

**Finalidade no contexto da SOFIA:**
- Consulta de dados de servidores do Serviço Exterior Brasileiro (remuneração, lotação, afastamentos)
- Verificação de contratos, licitações e despesas do MRE
- Consulta de viagens a serviço de servidores do MRE
- Acesso a dados de imóveis funcionais no exterior
- Transparência ativa sobre benefícios e programas relacionados à carreira

**Configuração:**
```json
{
  "mcpServers": {
    "portal-transparencia": {
      "command": "npx",
      "args": ["mcp-portal-transparencia-brasil"],
      "env": {
        "PORTAL_API_KEY": "${PORTAL_TRANSPARENCIA_API_KEY}"
      }
    }
  }
}
```

**Requisito:** Chave de API gratuita obtida em [portaldatransparencia.gov.br/api-de-dados](https://portaldatransparencia.gov.br/api-de-dados/cadastrar)

**Observação:** O MCP consome exclusivamente dados públicos já disponíveis a qualquer cidadão via Portal da Transparência. Nenhum dado privado é armazenado ou exposto.

---

## 6. FUNCIONALIDADES

### 6.1 MVP (v1.0)

- [ ] Interface de chat com streaming de respostas
- [ ] RAG com base de conhecimento legislativa e normativa
- [ ] System prompt da SOFIA (identidade, tom, restrições)
- [ ] Histórico de conversa por sessão
- [ ] Citação automática da fonte (dispositivo legal ou documento) quando aplicável
- [ ] Resposta de fallback quando a pergunta está fora do escopo

### 6.2 Futuras versões (backlog)

- Autenticação de associados (acesso diferenciado por perfil)
- Painel de administração para ingestão de novos documentos
- Feedback por mensagem (👍/👎) para melhoria contínua
- Integração com Monday.com (ASOF) via n8n para abertura de chamados
- Histórico persistente por usuário autenticado

---

## 7. REQUISITOS NÃO FUNCIONAIS

| Requisito | Especificação |
|-----------|---------------|
| Latência | Primeira resposta em streaming em até 3s |
| Disponibilidade | 99% (garantida pela Vercel + Supabase) |
| Idioma | Português brasileiro |
| Tom | Formal, compatível com o padrão MRE |
| Segurança | Variáveis de ambiente via Vercel + Supabase integration; chave OpenAI nunca exposta no cliente |
| Escalabilidade | Supabase Free suporta até 500 MB de banco; upgrade conforme crescimento |

---

## 8. RESTRIÇÕES

- A SOFIA não emite pareceres jurídicos vinculantes
- Respostas baseadas estritamente na base de conhecimento indexada e no conhecimento do LLM
- Sem armazenamento de dados pessoais dos usuários no MVP
- Custo variável limitado ao uso da API OpenAI (embeddings + geração)

---

## 9. CRITÉRIOS DE ACEITAÇÃO (MVP)

1. Chatbot responde perguntas sobre legislação da carreira citando o artigo correspondente
2. Perguntas fora do escopo recebem resposta de redirecionamento adequada
3. Streaming funcional sem timeout na Vercel Free
4. Base de conhecimento indexada com os documentos da seção 5.3
5. Deploy funcional em produção na Vercel com domínio configurado

---

## 10. MARCOS DO PROJETO

| Marco | Entregável |
|-------|------------|
| M1 | Setup Vercel + Supabase + pgvector configurado |
| M2 | Pipeline de ingestão de documentos funcionando |
| M3 | Chatbot MVP com RAG em ambiente de staging |
| M4 | Validação com Gabriel Ramos (Coordenador Administrativo) |
| M5 | Deploy em produção |

---

## 11. DEPENDÊNCIAS

- Aprovação do system prompt da SOFIA por Gabriel Ramos (Coordenador Administrativo)
- Fornecimento dos documentos internos da ASOF para ingestão
- Chave de API OpenAI ativa
- Chave de API do Portal da Transparência (gratuita, cadastro em portaldatransparencia.gov.br)
- Domínio definido para deploy em produção
