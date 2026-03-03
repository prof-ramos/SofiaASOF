# Base de Conhecimento - SOFIA

## Documentos Disponíveis

### Leis
- `lei-8112-1990-rju.txt` - Regime Jurídico dos Servidores Públicos Civis da União

### Decretos
- `decreto-1171-1994-codigo-etica.txt` - Código de Ética Profissional do Servidor Público Civil do Poder Executivo Federal

### Convenções Internacionais
- `convencao-viena-relacoes-diplomaticas-1961.txt` - Convenção de Viena sobre Relações Diplomáticas
- `convencao-asilo-diplomatico.txt` - Convenção sobre Asilo Diplomático

## Documentos Pendentes (adicionar manualmente)

### Alta Prioridade
| Documento | Fonte |
|-----------|-------|
| Lei nº 11.440/2006 (Lei do SEB) | https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11440.htm |
| Decreto nº 9.817/2019 (Regulamento do SEB) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2019/decreto/d9817.htm |
| Lei nº 9.615/1998 (Benefícios SE) | https://www.planalto.gov.br/ccivil_03/leis/l9615.htm |
| Decreto nº 6.134/2007 (Remuneração SE) | https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6134.htm |

### Média Prioridade
| Documento | Fonte |
|-----------|-------|
| Lei nº 8.027/1990 (Normas de Conduta) | https://www.planalto.gov.br/ccivil_03/leis/l8027.htm |
| Decreto nº 7.133/2010 (Avaliação Desempenho) | https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/decreto/d7133.htm |
| Manual de Redação Oficial e Diplomática do Itamaraty | https://www.itamaraty.gov.br |

### Documentos ASOF
- Estatuto da ASOF (fornecer)
- Posicionamentos institucionais (fornecer)
- Comunicados e circulares (fornecer)

## Como Adicionar Documentos

1. **Converter para texto**:
   - Se for .docx: usar `scripts/convert_docs.py`
   - Se for PDF: copiar texto manualmente ou usar ferramenta de extração
   - Se for HTML: copiar apenas o texto da lei

2. **Salvar na pasta correta**:
   - Leis → `docs/leis/`
   - Decretos → `docs/decretos/`
   - Manuais → `docs/manuais/`
   - Documentos ASOF → `docs/asof/`

3. **Nomear adequadamente**:
   - Formato: `tipo-numero-ano-descricao.txt`
   - Exemplo: `lei-11440-2006-servico-exterior.txt`

4. **Executar ingestão**:
   ```bash
   npm run ingest
   ```

## Status da Base

- [x] Lei 8.112/1990 (RJU)
- [x] Decreto 1.171/1994 (Código de Ética)
- [x] Convenção de Viena (Relações Diplomáticas)
- [x] Convenção de Asilo Diplomático
- [ ] Lei 11.440/2006 (SEB) - **PENDENTE**
- [ ] Decreto 9.817/2019 (Regulamento SEB) - **PENDENTE**
- [ ] Lei 9.615/1998 (Benefícios SE) - **PENDENTE**
- [ ] Decreto 6.134/2007 (Remuneração SE) - **PENDENTE**
- [ ] Lei 8.027/1990 (Normas de Conduta) - **PENDENTE**
- [ ] Decreto 7.133/2010 (Avaliação) - **PENDENTE**
- [ ] Manual Redação Itamaraty - **PENDENTE**
- [ ] Documentos ASOF - **PENDENTE**
