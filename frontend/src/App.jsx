import { useRef, useState } from "react";
import axios from "axios";

function App() {

  const videoRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);

  const [videoURL, setVideoURL] = useState("");

  const [uploadMessage, setUploadMessage] = useState("");

  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");

  const [timestamps, setTimestamps] = useState([]);

  const [loading, setLoading] = useState(false);


  // Upload Video
  const handleUpload = async () => {

    if (!videoFile) return;

    const formData = new FormData();

    formData.append("file", videoFile);

    try {

      setLoading(true);

      const response = await axios.post(
        "http://127.0.0.1:8000/upload-video",
        formData
      );

      setUploadMessage(
        response.data.message
      );

      setLoading(false);

    } catch (error) {

      console.error(error);

      setLoading(false);
    }
  };


  // Ask Question
  const askQuestion = async () => {

    if (!question) return;

    try {

      setLoading(true);

      const response = await axios.post(
        "http://127.0.0.1:8000/chat",
        {
          question: question
        }
      );

      setAnswer(
        response.data.answer
      );

      setTimestamps(
        response.data.timestamps
      );

      setLoading(false);

    } catch (error) {

      console.error(error);

      setLoading(false);
    }
  };


  // Jump to Timestamp
  const jumpToTimestamp = (time) => {

    if (videoRef.current) {

      videoRef.current.currentTime = time;

      videoRef.current.play();
    }
  };


  // Format Seconds
  const formatTime = (seconds) => {

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };


  return (

    <div
      style={{
        padding: "20px",
        maxWidth: "900px",
        margin: "auto",
        fontFamily: "Arial"
      }}
    >

      <h1>Video RAG Chatbot</h1>

      {/* Upload Section */}
      <div style={{ marginBottom: "20px" }}>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => {

            const file = e.target.files[0];

            setVideoFile(file);

            setVideoURL(
              URL.createObjectURL(file)
            );
          }}
        />

        <button
          onClick={handleUpload}
          style={{
            marginLeft: "10px",
            padding: "10px"
          }}
        >
          Upload Video
        </button>

      </div>

      {/* Upload Message */}
      <p>{uploadMessage}</p>

      {/* Video Player */}
      {
        videoURL && (

          <video
            ref={videoRef}
            width="100%"
            controls
            style={{
              marginBottom: "20px"
            }}
          >
            <source
              src={videoURL}
              type="video/mp4"
            />
          </video>
        )
      }

      {/* Chat Section */}
      <div
        style={{
          marginTop: "20px"
        }}
      >

        <textarea
          rows="3"
          placeholder="Ask doubts from lecture..."
          value={question}
          onChange={(e) =>
            setQuestion(e.target.value)
          }
          style={{
            width: "100%",
            padding: "10px"
          }}
        />

        <button
          onClick={askQuestion}
          style={{
            marginTop: "10px",
            padding: "10px"
          }}
        >
          Ask Question
        </button>

      </div>

      {/* Loading */}
      {
        loading && (
          <p>Processing...</p>
        )
      }

      {/* Answer */}
      {
        answer && (

          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              border: "1px solid #ccc"
            }}
          >

            <h3>Answer</h3>

            <p>{answer}</p>

            <h4>Relevant Timestamps</h4>

            {
              timestamps.map(
                (item, index) => (

                  <button
                    key={index}

                    onClick={() =>
                      jumpToTimestamp(
                        item.start_time
                      )
                    }

                    style={{
                      marginRight: "10px",
                      marginBottom: "10px",
                      padding: "10px",
                      cursor: "pointer"
                    }}
                  >

                    {formatTime(
                      item.start_time
                    )}
                    {" - "}
                    {formatTime(
                      item.end_time
                    )}

                  </button>
                )
              )
            }

          </div>
        )
      }

    </div>
  );
}

export default App;