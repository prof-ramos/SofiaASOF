#!/usr/bin/env python3
"""Convert PDFs to text for SOFIA knowledge base."""

import os
import fitz  # pymupdf

def convert_pdf_to_txt(pdf_path: str, txt_path: str) -> None:
    """Convert a PDF file to plain text."""
    doc = fitz.open(pdf_path)
    text_parts = []
    
    for page in doc:
        text_parts.append(page.get_text())
    
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(text_parts))
    
    doc.close()
    print(f"  ✓ {os.path.basename(txt_path)} ({len(text_parts)} pages)")

def main():
    src_dir = "/root/.openclaw/media/inbound"
    dst_base = "/root/.openclaw/workspace/SofiaASOF/docs"
    
    # Ensure directories exist
    os.makedirs(f"{dst_base}/leis", exist_ok=True)
    os.makedirs(f"{dst_base}/decretos", exist_ok=True)
    os.makedirs(f"{dst_base}/medidas-provisorias", exist_ok=True)
    
    # Documents to process
    docs = [
        # Leis
        ("Lei-11440-2006---414de996-48b7-43a7-b057-d3b411fd4a44.pdf", 
         f"{dst_base}/leis/lei-11440-2006-servico-exterior.txt"),
        ("Lei-no-7.501-Regime-Juridico-dos-Servidores-do-SEB---95837873-cd2c-4df9-967b-10c590f56058.pdf",
         f"{dst_base}/leis/lei-7501-1986-regime-seb.txt"),
        ("Lei-8829-2023---433ce18f-a848-4821-87da-34b9bca81778.pdf",
         f"{dst_base}/leis/lei-8829-1993-carreiras-oc-ac.txt"),
        ("L8112compilado---bcc84c96-48b1-4a06-93e2-c9a89dd97e00.pdf",
         f"{dst_base}/leis/lei-8112-1990-rju-compilado.txt"),
        ("Lei-no-9.888---ee224e7c-bea5-4343-a3b1-13e93b3de77a.pdf",
         f"{dst_base}/leis/lei-9888-1999-alteracoes-seb.txt"),
        
        # Decretos
        ("Decreto-no-93.325-Regulamento-de-Pessoal-do-SEB---63c00dc1-f481-4e93-919b-77f3e4843705.pdf",
         f"{dst_base}/decretos/decreto-93325-1986-regulamento-pessoal-seb.txt"),
        ("Decreto-no-1.565---8b93cb7a-9188-4c37-ac4d-2e7b96a9c06a.pdf",
         f"{dst_base}/decretos/decreto-1565-1995-carreiras-oc-ac.txt"),
        ("d11357---098d1da7-d149-4570-839a-ca7671e90134",
         f"{dst_base}/decretos/decreto-11357-2015.txt"),
        
        # Medidas Provisórias
        ("MEDIDA-PROVISORIA-No319---f84d6e57-63e6-4f1c-8c10-d5f76cb23e56.pdf",
         f"{dst_base}/medidas-provisorias/mpv-319-2006-servico-exterior.txt"),
        
        # Outros
        ("Emenda-Parlamentar-no-1-de-2006---21dcd19a-e2b8-4cd3-b2a3-e70ccad3cb05.pdf",
         f"{dst_base}/leis/resolucao-1-2006-cn-orcamento.txt"),
    ]
    
    converted = 0
    for src_name, dst_path in docs:
        src_path = os.path.join(src_dir, src_name)
        if os.path.exists(src_path):
            print(f"Convertendo: {src_name}")
            convert_pdf_to_txt(src_path, dst_path)
            converted += 1
        else:
            print(f"  ✗ Não encontrado: {src_name}")
    
    print(f"\n{converted} documentos convertidos")

if __name__ == "__main__":
    main()
