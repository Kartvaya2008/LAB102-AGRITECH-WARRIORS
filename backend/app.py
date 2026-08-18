from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel
from quiz_pipeline import generate_quiz

import shutil
import os

LATEST_TRANSCRIPT_PATH = None

from transcriber import (
    extract_audio,
    transcribe_audio,
    save_transcript
)

from vector_store import (
    load_transcript,
    create_chunks,
    store_in_chroma,
    clear_chroma
)
from pdf_pipeline import (
    extract_pdf_text,
    create_pdf_chunks
)

from summary_pipeline import (
    generate_topic_summary,
    generate_last_5_min_summary,
    load_transcript
)

from rag_pipeline import ask_question
from utils import clear_directory, safely_delete_file


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/pdfs", StaticFiles(directory="pdfs"), name="pdfs")

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


class ChatRequest(BaseModel):
    question: str

class SummaryRequest(BaseModel):
    current_time: float

class QuizRequest(BaseModel):
    num_questions: int = 5

@app.get("/")
def home():

    return {
        "message": "Video RAG Chatbot Running"
    }


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):

    try:

        # Clear folders to start fresh
        clear_directory("uploads")
        clear_directory("audio")
        clear_directory("transcripts")
        clear_directory("pdfs")

        # Save video
        file_path = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract audio
        audio_path = extract_audio(file_path)

        # Transcribe
        transcript_data = transcribe_audio(audio_path)

        # Save transcript
        filename = os.path.splitext(file.filename)[0]

        global LATEST_TRANSCRIPT_PATH

        transcript_path = save_transcript(
            transcript_data,
            filename
        )

        LATEST_TRANSCRIPT_PATH = transcript_path

        # Safely delete raw video and audio files from backend
        safely_delete_file(file_path)
        safely_delete_file(audio_path)

        # Load transcript
        transcript_json = load_transcript(
            transcript_path
        )

        # Create chunks
        documents = create_chunks(
            transcript_json
        )

        # Clear existing Chroma DB collection
        clear_chroma()

        # Store in ChromaDB
        store_in_chroma(documents)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Video processed successfully",
                "chunks_created": len(documents)
            }
        )

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={
                "error": str(e)
            }
        )


@app.post("/chat")
async def chat(request: ChatRequest):

    try:

        result = ask_question(
            request.question
        )

        return JSONResponse(
            status_code=200,
            content=result
        )

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={
                "error": str(e)
            }
        )
    
@app.get("/topic-summary")
async def topic_summary():

    try:

        transcript_data = load_transcript(
            LATEST_TRANSCRIPT_PATH
        )

        summary = generate_topic_summary(
            transcript_data
        )

        return {
            "summary": summary
        }

    except Exception as e:

        return {
            "error": str(e)
        }

@app.post("/last-5-min-summary")
async def last_5_min_summary(
    request: SummaryRequest
):

    try:

        transcript_data = load_transcript(
            LATEST_TRANSCRIPT_PATH
        )

        summary = generate_last_5_min_summary(
            transcript_data,
            request.current_time
        )

        return {
            "summary": summary
        }

    except Exception as e:

        return {
            "error": str(e)
        }
    

@app.post("/generate-quiz")
async def generate_quiz_api(
    request: QuizRequest
):

    try:

        transcript_data = load_transcript(
            LATEST_TRANSCRIPT_PATH
        )

        quiz = generate_quiz(
            transcript_data,
            request.num_questions
        )

        return {
            "quiz": quiz
        }

    except Exception as e:

        return {
            "error": str(e)
        }

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    try:

        # Clear folders to start fresh
        clear_directory("uploads")
        clear_directory("audio")
        clear_directory("transcripts")
        clear_directory("pdfs")

        pdf_path = os.path.join(
            "pdfs",
            file.filename
        )

        with open(pdf_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        # Extract PDF text
        pages = extract_pdf_text(
            pdf_path
        )

        # Create chunks
        documents = create_pdf_chunks(
            pages
        )


        # Clear existing Chroma DB collection
        clear_chroma()

        # Store in Chroma
        store_in_chroma(documents)


        return {
            "message": "PDF uploaded successfully",
            "pages": len(pages),
            "chunks_created": len(documents),
            "filename": file.filename
        }


    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={
                "error": str(e)
            }
        )