import json
import os
from langchain_core.documents import Document

from langchain_huggingface import HuggingFaceEmbeddings

from langchain_community.vectorstores import Chroma


# Embedding model
embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

# Chroma DB path
CHROMA_DB_DIR = "chroma_db"

os.makedirs(CHROMA_DB_DIR, exist_ok=True)


def create_chunks(transcript_data, chunk_size=3):

    documents = []

    current_chunk = []
    start_time = None
    end_time = None

    for i, segment in enumerate(transcript_data):

        if start_time is None:
            start_time = segment["start"]

        end_time = segment["end"]

        current_chunk.append(segment["text"])

        # Create chunk every N segments
        if len(current_chunk) >= chunk_size:

            chunk_text = " ".join(current_chunk)

            doc = Document(
                page_content=chunk_text,
                metadata={
                    "source_type": "video",
                    "start_time": start_time,
                    "end_time": end_time
                }
            )

            documents.append(doc)

            # Reset
            current_chunk = []
            start_time = None

    # Remaining chunk
    if current_chunk:

        chunk_text = " ".join(current_chunk)

        doc = Document(
            page_content=chunk_text,
            metadata={
                "start_time": start_time,
                "end_time": end_time
            }
        )

        documents.append(doc)

    return documents


def load_transcript(transcript_path):

    with open(transcript_path, "r", encoding="utf-8") as f:
        transcript_data = json.load(f)

    return transcript_data


def store_in_chroma(documents):

    vectordb = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embedding_model
    )

    vectordb.add_documents(documents)

    return vectordb


def clear_chroma():

    try:

        vectordb = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=embedding_model
        )

        vectordb.delete_collection()

    except Exception as e:

        print(f"Error clearing Chroma DB collection: {e}")

    # Clean up unlocked index subdirectories (from older sessions or deleted collections)
    import shutil
    if os.path.exists(CHROMA_DB_DIR):
        for item in os.listdir(CHROMA_DB_DIR):
            item_path = os.path.join(CHROMA_DB_DIR, item)
            if os.path.isdir(item_path) and item != "." and item != "..":
                try:
                    shutil.rmtree(item_path)
                except Exception:
                    pass