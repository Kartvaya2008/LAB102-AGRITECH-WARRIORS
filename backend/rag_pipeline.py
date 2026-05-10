import os

from dotenv import load_dotenv

from langchain_groq import ChatGroq

from langchain_huggingface import HuggingFaceEmbeddings

from langchain_community.vectorstores import Chroma


# Load env variables
load_dotenv()

# Embedding model
embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

# Load ChromaDB
vectordb = Chroma(
    persist_directory="chroma_db",
    embedding_function=embedding_model
)

# Retriever
retriever = vectordb.as_retriever(
    search_kwargs={"k": 3}
)

# Groq LLM
llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),

    model_name="llama-3.3-70b-versatile",

    temperature=0
)


def ask_question(question):

    vectordb = Chroma(
        persist_directory="chroma_db",
        embedding_function=embedding_model
    )

    retriever = vectordb.as_retriever(
        search_kwargs={"k": 4}
    )

    docs = retriever.invoke(question)

    if not docs:

        return {
            "answer": "No relevant content found.",
            "sources": []
        }
    
    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )


    prompt = f"""
You are an AI LMS tutor.

Answer ONLY from the provided context.

Context:
{context}

Question:
{question}

Answer:
"""


    response = llm.invoke(prompt)

    sources = []

    for doc in docs:

        metadata = doc.metadata

        if metadata.get("source_type") == "video":

            sources.append({
                "type": "video",
                "start_time": metadata.get("start_time"),
                "end_time": metadata.get("end_time")
            })

        elif metadata.get("source_type") == "pdf":

            sources.append({
                "type": "pdf",
                "page": metadata.get("page")
            })
    
    return {
        "answer": response.content,
        "sources": sources
    }

