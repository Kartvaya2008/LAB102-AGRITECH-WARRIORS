import json
import os

from dotenv import load_dotenv

from langchain_groq import ChatGroq

load_dotenv()


# Groq LLM
llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),

    model_name="llama-3.3-70b-versatile",

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


# Combine transcript
def transcript_to_text(transcript_data):

    full_text = ""

    for segment in transcript_data:

        full_text += segment["text"] + " "

    return full_text


# Topic-wise summary
def generate_topic_summary(transcript_data):

    full_text = transcript_to_text(
        transcript_data
    )

    prompt = f"""
You are an AI lecture assistant.

Analyze the lecture transcript.

1. Detect important topics
2. Generate topic-wise summaries
3. Keep summaries student-friendly
4. Use bullet points

Lecture Transcript:
{full_text}
"""

    response = llm.invoke(prompt)

    return response.content


# Last 5 minute summary
def generate_last_5_min_summary(
    transcript_data,
    current_time
):

    start_window = max(
        0,
        current_time - 300
    )

    relevant_text = []

    for segment in transcript_data:

        if (
            segment["start"] >= start_window
            and
            segment["end"] <= current_time
        ):

            relevant_text.append(
                segment["text"]
            )

    context = " ".join(relevant_text)

    if not context:

        return "No lecture content found."

    prompt = f"""
Summarize this lecture section
in simple student-friendly language.

Lecture Section:
{context}
"""

    response = llm.invoke(prompt)

    return response.content