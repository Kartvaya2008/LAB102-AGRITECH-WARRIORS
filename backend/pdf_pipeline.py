import os
import fitz
from langchain_core.documents import Document


os.makedirs("pdfs", exist_ok=True)


# Extract text from PDF

def extract_pdf_text(pdf_path):

    doc = fitz.open(pdf_path)

    pages = []

    for page_num in range(len(doc)):

        page = doc.load_page(page_num)

        text = page.get_text()
        pages.append({
            "page": page_num + 1,
            "text": text
        })

    return pages


# Create chunks

def create_pdf_chunks(pages, chunk_size=500):

    documents = []

    for item in pages:

        page_number = item["page"]

        text = item["text"]

        words = text.split()

        for i in range(0, len(words), chunk_size):
            chunk_words = words[i:i + chunk_size]

            chunk_text = " ".join(chunk_words)

            doc = Document(
                page_content=chunk_text,
                metadata={
                    "source_type": "pdf",
                    "page": page_number
                }
            )

            documents.append(doc)

    return documents