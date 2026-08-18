import json
import os

from dotenv import load_dotenv

from langchain_groq import ChatGroq

load_dotenv()


# LLM
llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),

    model_name="openai/gpt-oss-120b",

    temperature=0
)


# Load transcript
def load_transcript(transcript_path):

    with open(
        transcript_path,
        "r",
        encoding="utf-8"
    ) as f:

        transcript_data = json.load(f)

    return transcript_data


# Convert transcript to text
def transcript_to_text(transcript_data):

    text = ""

    for segment in transcript_data:

        text += segment["text"] + " "

    return text


# Generate quiz
def generate_quiz(
    transcript_data,
    num_questions=5
):

    lecture_text = transcript_to_text(
        transcript_data
    )

    prompt = f"""
You are an AI quiz generator.

Generate {num_questions} multiple choice questions
from the lecture transcript.

Return ONLY valid JSON array.

Format:

[
  {{
    "question": "...",
    "options": [
      "...",
      "...",
      "...",
      "..."
    ],
    "correct_answer": "..."
  }}
]

Lecture Transcript:
{lecture_text}
"""

    response = llm.invoke(prompt)

    import json

    try:

        return json.loads(
            response.content
        )

    except Exception as e:

        print(e)

        return []