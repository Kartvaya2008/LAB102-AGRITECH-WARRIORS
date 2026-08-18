import os
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)
CHROMA_DB_DIR = "chroma_db"

print("Initializing Chroma...")
vectordb = Chroma(
    persist_directory=CHROMA_DB_DIR,
    embedding_function=embedding_model
)

print("Deleting collection...")
try:
    vectordb.delete_collection()
    print("Collection deleted successfully.")
except Exception as e:
    print("Error deleting collection:", e)
