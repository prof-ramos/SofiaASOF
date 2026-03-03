# Base de Conhecimento - SOFIA

## Documentos para Ingestão Inicial

### 1. Legislação Estruturante

| Norma | Prioridade | Status |
|-------|------------|--------|
| Lei nº 11.440/2006 | Alta | Pendente |
| Decreto nº 9.817/2019 | Alta | Pendente |
| Lei nº 8.112/1990 | Alta | Pendente |
| Lei nº 8.027/1990 | Média | Pendente |
| Decreto nº 1.171/1994 | Média | Pendente |
| Decreto nº 7.133/2010 | Média | Pendente |
| Lei nº 12.527/2011 (LAI) | Baixa | Pendente |
| Decreto nº 7.724/2012 | Baixa | Pendente |

### 2. Benefícios e Remuneração no Exterior

| Norma | Prioridade | Status |
|-------|------------|--------|
| Lei nº 9.615/1998 | Alta | Pendente |
| Decreto nº 6.134/2007 | Alta | Pendente |
| Portarias MRE (vigentes) | Alta | Pendente |

### 3. Redação Oficial

| Documento | Prioridade | Status |
|-----------|------------|--------|
| Manual de Redação Oficial e Diplomática do Itamaraty (2024) | Alta | Pendente |
| Manual de Redação da Presidência da República | Média | Pendente |

### 4. Documentos ASOF

| Documento | Prioridade | Status |
|-----------|------------|--------|
| Estatuto da ASOF | Alta | Pendente |
| Posicionamentos institucionais | Média | Pendente |
| Comunicados e circulares | Baixa | Pendente |

### 5. Concurso

| Documento | Prioridade | Status |
|-----------|------------|--------|
| Edital CESPE/CEBRASPE (vigente) | Alta | Pendente |

## Formato dos Arquivos

- **Formato**: Texto simples (`.txt`)
- **Codificação**: UTF-8
- **Nomeclatura**: `[tipo]-[numero]-[ano].txt`
  - Exemplo: `lei-11440-2006.txt`, `decreto-9817-2019.txt`

## Estrutura de Diretórios

```
documents/
├── leis/
│   ├── lei-11440-2006.txt
│   ├── lei-8112-1990.txt
│   ├── lei-8027-1990.txt
│   ├── lei-9615-1998.txt
│   └── lei-12527-2011.txt
├── decretos/
│   ├── decreto-9817-2019.txt
│   ├── decreto-6134-2007.txt
│   ├── decreto-1171-1994.txt
│   ├── decreto-7133-2010.txt
│   └── decreto-7724-2012.txt
├── manuais/
│   ├── redacao-oficial-itamaraty-2024.txt
│   └── redacao-presidencia.txt
├── portarias/
│   └── [portarias-mre].txt
├── asof/
│   ├── estatuto.txt
│   ├── posicionamentos.txt
│   └── comunicados.txt
└── concursos/
    └── edital-oficial-chancelaria.txt
```

## Fontes

- **Leis e Decretos**: Planalto.gov.br
- **Manuais MRE**: Itamaraty.gov.br
- **Documentos ASOF**: Fornecidos pela Coordenação Administrativa
- **Editais**: Cebraspe.cest.br

## Próximos Passos

1. [ ] Baixar textos originais das leis/decretos
2. [ ] Converter para texto simples
3. [ ] Limpar formatação (cabeçalhos, rodapés)
4. [ ] Organizar na estrutura de diretórios
5. [ ] Executar ingestão
