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

    # Retrieve relevant docs
    docs = retriever.invoke(question)

    # Combine context
    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    # Prompt
    prompt = f"""
You are a helpful AI study assistant.

Answer ONLY from the provided lecture transcript context.

If answer is not present, say:
"I could not find this in the lecture."

Context:
{context}

Question:
{question}

Answer:
"""

    # Generate response
    response = llm.invoke(prompt)

    # Extract timestamps
    timestamps = []

    for doc in docs:

        timestamps.append({
            "start_time": doc.metadata.get("start_time"),
            "end_time": doc.metadata.get("end_time")
        })

    return {
        "answer": response.content,
        "timestamps": timestamps
    }