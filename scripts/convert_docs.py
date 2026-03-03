#!/usr/bin/env python3
"""Convert selected docx files to txt for SOFIA knowledge base."""

import os
import sys
from docx import Document

def convert_docx_to_txt(docx_path: str, txt_path: str) -> None:
    """Convert a docx file to plain text."""
    doc = Document(docx_path)
    text_parts = []
    for para in doc.paragraphs:
        text_parts.append(para.text)
    
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(text_parts))
    
    print(f"  ✓ {os.path.basename(txt_path)}")

def main():
    src_base = "/root/.openclaw/workspace/botspace-temp/docs_rag/legislacao_grifada_e_anotada_atualiz_em_01_01_2026"
    dst_base = "/root/.openclaw/workspace/SofiaASOF/docs"
    
    # Documents to copy (source -> destination)
    docs = [
        # Administrativo
        (f"{src_base}/administrativo/regime_juridico_dos_servidores_civis_da_uniao_lei_8112.docx",
         f"{dst_base}/leis/lei-8112-1990-rju.txt"),
        (f"{src_base}/administrativo/codigo_de_etica_profissional_do_servidor_publico_civil_do_poder_executivo_federal_dec_1171.docx",
         f"{dst_base}/decretos/decreto-1171-1994-codigo-etica.txt"),
        
        # Direito Internacional
        (f"{src_base}/constitucional_direitos_humanos_internacional/convencao_de_viena_sobre_relacoes_diplomaticas_1961.docx",
         f"{dst_base}/convencoes/convencao-viena-relacoes-diplomaticas-1961.txt"),
        (f"{src_base}/constitucional_direitos_humanos_internacional/convencao_sobre_asilo_diplomatico.docx",
         f"{dst_base}/convencoes/convencao-asilo-diplomatico.txt"),
    ]
    
    converted = 0
    for src, dst in docs:
        if os.path.exists(src):
            print(f"Convertendo: {os.path.basename(src)}")
            convert_docx_to_txt(src, dst)
            converted += 1
        else:
            print(f"  ✗ Não encontrado: {src}")
    
    print(f"\n{converted} documentos convertidos para {dst_base}")

if __name__ == "__main__":
    main()
