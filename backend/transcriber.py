from faster_whisper import WhisperModel
from moviepy import VideoFileClip
import os
import json

# Create folders automatically
os.makedirs("audio", exist_ok=True)
os.makedirs("transcripts", exist_ok=True)

# Load Whisper model
model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


def extract_audio(video_path):

    filename = os.path.basename(video_path).split(".")[0]

    audio_path = f"audio/{filename}.mp3"

    video = VideoFileClip(video_path)

    video.audio.write_audiofile(audio_path)

    return audio_path


def transcribe_audio(audio_path):

    segments, info = model.transcribe(
        audio_path,
        beam_size=5
    )

    transcript_data = []

    for segment in segments:

        transcript_data.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip()
        })

    return transcript_data


def save_transcript(transcript_data, filename):

    transcript_path = f"transcripts/{filename}.json"

    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(
            transcript_data,
            f,
            indent=4,
            ensure_ascii=False
        )

    return transcript_path