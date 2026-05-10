
import {
  Upload,
  Brain,
  FileText,
  Clock,
  BookOpen,
  Sparkles,
  PlayCircle,
  MessageSquare,
  FileQuestion,
} from "lucide-react";

import {
  useRef,
  useState,
  useEffect,
} from "react";

import axios from "axios";


function App() {

  const videoRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const [videoURL, setVideoURL] = useState("");

  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");

  const [sources, setSources] = useState([]);

  const [loading, setLoading] = useState(false);

  const [uploadMessage, setUploadMessage] = useState("");

  const [topicSummary, setTopicSummary] = useState("");

  const [last5Summary, setLast5Summary] = useState("");

  const [quiz, setQuiz] = useState([]);

  const [error, setError] = useState("");

  const [uploadProgress, setUploadProgress] = useState(0);

  const [processingStep, setProcessingStep] = useState("");

  const [selectedAnswers, setSelectedAnswers] = useState({});

  const [showResults, setShowResults] = useState(false);

  const [score, setScore] = useState(0);


  // Upload Video
  const handleUpload = async () => {

    if (!videoFile) {

      setError("Please select a video");

      return;
    }

    const formData = new FormData();

    formData.append("file", videoFile);

    try {

      setLoading(true);

      setUploadProgress(0);

      setError("");

      setUploadMessage("");

      setProcessingStep(
        "Uploading video..."
      );

      const response = await axios.post(
        "http://127.0.0.1:8000/upload-video",

        formData,

        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },

          timeout: 1000 * 60 * 20,

          onUploadProgress: (
            progressEvent
          ) => {

            const percent =
              Math.round(
                (
                  progressEvent.loaded * 100
                ) /
                progressEvent.total
              );

            setUploadProgress(percent);

            if (percent < 100) {

              setProcessingStep(
                `Uploading Video... ${percent}%`
              );

            } else {

              setProcessingStep(
                "AI is processing lecture..."
              );
            }
          },
        }
      );

      setUploadMessage(
        response.data.message ||
        "Video uploaded successfully"
      );

      setProcessingStep(
        "Generating topic summaries..."
      );

      await fetchTopicSummary();

      await fetchLast5MinSummary();

      setProcessingStep(
        "Completed"
      );

    } catch (error) {

      console.error(error);

      setError(
        error?.response?.data?.error ||
        "Video upload failed"
      );

    } finally {

      setLoading(false);
    }
  };


  // Upload PDF
  const handlePdfUpload = async () => {

    if (!pdfFile) {

      setError("Please select PDF");

      return;
    }

    const formData = new FormData();

    formData.append("file", pdfFile);

    try {

      setLoading(true);

      setError("");

      const response = await axios.post(

        "http://127.0.0.1:8000/upload-pdf",

        formData,

        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      console.log(response.data);

      setUploadMessage(
        "PDF uploaded successfully"
      );

    } catch (error) {

      console.error(error);

      setError(
        error?.response?.data?.error ||
        "PDF upload failed"
      );

    } finally {

      setLoading(false);
    }
  };


  // Ask Question
  const askQuestion = async () => {

    if (!question) return;

    try {

      setLoading(true);

      setError("");

      const response = await axios.post(
        "http://127.0.0.1:8000/chat",
        {
          question,
        }
      );

      setAnswer(
        response.data.answer ||
        "No answer found"
      );

      setSources(
        Array.isArray(response.data.sources)
          ? response.data.sources
          : []
      );

    } catch (error) {

      console.error(error);

      setError(
        error?.response?.data?.error ||
        "Chat failed"
      );

    } finally {

      setLoading(false);
    }
  };


  // Topic Summary
  const fetchTopicSummary = async () => {

    try {

      const response = await axios.get(
        "http://127.0.0.1:8000/topic-summary"
      );

      setTopicSummary(response.data.summary);

    } catch (error) {

      console.error(error);
    }
  };


  // Last 5 Min Summary
  const fetchLast5MinSummary = async () => {

    if (!videoRef.current) return;

    try {

      const currentTime =
        videoRef.current.currentTime;

      const response = await axios.post(
        "http://127.0.0.1:8000/last-5-min-summary",
        {
          current_time: currentTime,
        }
      );

      setLast5Summary(response.data.summary);

    } catch (error) {

      console.error(error);
    }
  };


  // Generate Quiz
  const generateQuiz = async () => {

    try {

      setLoading(true);

      setError("");

      setSelectedAnswers({});

      setShowResults(false);

      setScore(0);

      const response = await axios.post(
        "http://127.0.0.1:8000/generate-quiz",
        {
          num_questions: 5,
        }
      );

      let quizData = response.data.quiz;

      if (typeof quizData === "string") {

        try {

          quizData = JSON.parse(quizData);

        } catch {

          quizData = [];
        }
      }

      if (!Array.isArray(quizData)) {

        quizData = [];
      }

      setQuiz(quizData);

    } catch (error) {

      console.error(error);

      setError(
        error?.response?.data?.error ||
        "Quiz generation failed"
      );

    } finally {

      setLoading(false);
    }
  };


  // Select Answer
  const selectAnswer = (
    questionIndex,
    option
  ) => {

    setSelectedAnswers((prev) => ({

      ...prev,

      [questionIndex]: option,

    }));
  };


  // Submit Quiz
  const submitQuiz = () => {

    let correct = 0;

    quiz.forEach((item, index) => {

      if (

        selectedAnswers[index] ===
        item.correct_answer

      ) {

        correct++;
      }
    });

    setScore(correct);

    setShowResults(true);
  };


  // Jump Timestamp
  const jumpToTimestamp = (time) => {

    if (videoRef.current) {

      videoRef.current.currentTime = time;

      videoRef.current.play();
    }
  };


  // Format Time
  const formatTime = (seconds) => {

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };


  // Auto Live Summary
  useEffect(() => {

    const interval = setInterval(() => {

      if (videoRef.current && videoURL) {

        fetchLast5MinSummary();
      }

    }, 60000);

    return () => clearInterval(interval);

  }, [videoURL]);


  return (

    <div className="min-h-screen bg-slate-950 text-white">

      {/* Navbar */}
      <div className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-50">

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                AI Learning Assistant
              </h1>

              <p className="text-slate-400 text-sm">
                Multimodal LMS Intelligence Platform
              </p>
            </div>

          </div>

        </div>

      </div>


      {/* Error */}
      {
        error && (

          <div className="max-w-7xl mx-auto px-6 pt-4">

            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-2xl">

              {error}

            </div>

          </div>
        )
      }




{/* Premium Hero Section */}

<div className="relative overflow-hidden">

  {/* Background Glow */}
  <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full"></div>

  <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full"></div>


  <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-14">

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">


      {/* LEFT CONTENT */}
      <div>

        {/* Badge */}
        <div className="inline-flex items-center gap-3 bg-slate-900/80 border border-slate-700 px-5 py-3 rounded-full mb-8 backdrop-blur-xl">

          <Sparkles className="text-yellow-400" size={18} />

          <span className="text-sm text-slate-300">

            AI-Powered Multimodal Learning Platform

          </span>

        </div>


        {/* Main Heading */}
        <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">

          Turn Passive

          <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            {" "}
            Lecture Videos
          </span>

          <br />

          Into

          <span className="bg-gradient-to-r from-pink-400 to-orange-400 text-transparent bg-clip-text">
            {" "}
            Interactive AI Learning
          </span>

        </h1>


        {/* Subtitle */}
        <p className="text-slate-300 text-xl leading-9 mb-10 max-w-2xl">

          Upload lecture videos and PDFs, ask AI-powered doubts,
          jump to exact timestamps, generate quizzes,
          and get live topic summaries —
          all inside one intelligent LMS assistant.

        </p>


        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-5 mb-12">

          <button className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:scale-105 transition-all shadow-2xl shadow-blue-500/20">

            Start Learning with AI

          </button>


          <button className="bg-slate-900 border border-slate-700 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-slate-800 transition-all">

            Watch Demo

          </button>

        </div>


        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">

            <h3 className="text-3xl font-bold text-blue-400">

              AI

            </h3>

            <p className="text-slate-400 mt-2">

              Tutor Chat

            </p>

          </div>


          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">

            <h3 className="text-3xl font-bold text-purple-400">

              Live

            </h3>

            <p className="text-slate-400 mt-2">

              Summaries

            </p>

          </div>


          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">

            <h3 className="text-3xl font-bold text-pink-400">

              Smart

            </h3>

            <p className="text-slate-400 mt-2">

              Quizzes

            </p>

          </div>


          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">

            <h3 className="text-3xl font-bold text-green-400">

              PDF

            </h3>

            <p className="text-slate-400 mt-2">

              + Video RAG

            </p>

          </div>

        </div>

      </div>


      {/* RIGHT SIDE AI CARD */}
      <div className="relative">

        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-[40px]"></div>

        <div className="relative bg-slate-900/90 border border-slate-800 rounded-[40px] p-8 backdrop-blur-2xl shadow-2xl">


          {/* AI Assistant Header */}
          <div className="flex items-center justify-between mb-8">

            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">

                <Brain size={30} />

              </div>

              <div>

                <h2 className="text-2xl font-bold">

                  AI Learning Assistant

                </h2>

                <p className="text-slate-400">

                  Real-time Lecture Intelligence

                </p>

              </div>

            </div>


            <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>

          </div>


          {/* Feature Cards */}
          <div className="space-y-5">


            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 flex items-start gap-4 hover:border-blue-500 transition-all">

              <MessageSquare className="text-blue-400 mt-1" />

              <div>

                <h3 className="font-semibold text-lg">

                  AI Doubt Solving

                </h3>

                <p className="text-slate-400 mt-1 leading-7">

                  Ask questions from lecture videos and PDFs with contextual AI understanding.

                </p>

              </div>

            </div>


            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 flex items-start gap-4 hover:border-purple-500 transition-all">

              <PlayCircle className="text-purple-400 mt-1" />

              <div>

                <h3 className="font-semibold text-lg">

                  Timestamp Navigation

                </h3>

                <p className="text-slate-400 mt-1 leading-7">

                  Jump directly to the exact lecture explanation with AI-generated timestamps.

                </p>

              </div>

            </div>


            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 flex items-start gap-4 hover:border-pink-500 transition-all">

              <FileQuestion className="text-pink-400 mt-1" />

              <div>

                <h3 className="font-semibold text-lg">

                  Smart Quiz Generation

                </h3>

                <p className="text-slate-400 mt-1 leading-7">

                  Generate interactive quizzes automatically from lectures and notes.

                </p>

              </div>

            </div>


            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 flex items-start gap-4 hover:border-green-500 transition-all">

              <Clock className="text-green-400 mt-1" />

              <div>

                <h3 className="font-semibold text-lg">

                  Live Learning Summaries

                </h3>

                <p className="text-slate-400 mt-1 leading-7">

                  Get topic-wise and last 5-minute AI summaries in real time.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</div>




      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          {/* Video Upload */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center gap-3 mb-5">
              <Upload className="text-blue-400" />
              <h2 className="text-2xl font-semibold">
                Upload Lecture Video
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4">

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

                className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl"
              />

              <button
                disabled={loading}
                onClick={handleUpload}
                className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-2xl font-semibold"
              >

                Upload & Process

              </button>

            </div>

            {
              loading && (

                <div className="mt-6">

                  <div className="flex justify-between mb-2 text-sm text-slate-300">

                    <span>
                      {processingStep}
                    </span>

                    <span>
                      {uploadProgress}%
                    </span>

                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">

                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 transition-all duration-300"

                      style={{
                        width: `${uploadProgress}%`
                      }}
                    />

                  </div>

                </div>
              )
            }

          </div>


          {/* PDF Upload */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center gap-3 mb-5">

              <FileText className="text-purple-400" />

              <h2 className="text-2xl font-semibold">

                Upload Study PDF

              </h2>

            </div>

            <div className="flex flex-col md:flex-row gap-4">

              <input
                type="file"
                accept=".pdf"

                onChange={(e) => {

                  setPdfFile(
                    e.target.files[0]
                  );

                }}

                className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl"
              />

              <button

                disabled={loading}

                onClick={handlePdfUpload}

                className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-2xl font-semibold"

              >

                Upload PDF

              </button>

            </div>

          </div>


          {/* Video Player */}
          {
            videoURL && (

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">

                <div className="flex items-center justify-between mb-4">

                  <div className="flex items-center gap-3">

                    <PlayCircle className="text-blue-400" />

                    <h2 className="text-2xl font-semibold">

                      AI Smart Lecture Player

                    </h2>

                  </div>

                </div>

                <video
                  ref={videoRef}
                  controls
                  className="w-full rounded-2xl"
                >

                  <source
                    src={videoURL}
                    type="video/mp4"
                  />

                </video>

                <div className="mt-3 text-slate-400 text-sm">

                  Ask questions and jump directly to relevant lecture timestamps.

                </div>

              </div>
            )
          }


          {/* Chat */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center gap-3 mb-5">

              <MessageSquare className="text-purple-400" />

              <h2 className="text-2xl font-semibold">

                AI Tutor Chat

              </h2>

            </div>

            <textarea
              rows="4"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask doubts from lecture videos or PDFs..."

              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 outline-none"
            />

            <button
              disabled={loading}
              onClick={askQuestion}

              className="mt-5 bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-4 rounded-2xl font-semibold"
            >

              Ask AI Tutor

            </button>


            {
              answer && (

                <div className="mt-6 bg-slate-800 border border-slate-700 rounded-2xl p-6">

                  <h3 className="text-xl font-semibold text-blue-400 mb-4">

                    AI Answer

                  </h3>

                  <p className="text-slate-200 leading-8 whitespace-pre-wrap">

                    {answer}

                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">

                    {
                      Array.isArray(sources) &&
                      sources.map((source, index) => (

                        <div key={index}>

                          {
                            source.type === "video" && (

                              <button
                                onClick={() =>
                                  jumpToTimestamp(
                                    source.start_time
                                  )
                                }

                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl"
                              >

                                Jump to:
                                {" "}
                                {formatTime(
                                  source.start_time
                                )}

                              </button>
                            )
                          }

                          {
                            source.type === "pdf" && (

                              <div className="bg-purple-600 px-4 py-2 rounded-xl">

                                PDF Page:
                                {" "}
                                {source.page}

                              </div>
                            )
                          }

                        </div>
                      ))
                    }

                  </div>

                </div>
              )
            }

          </div>

        </div>


        {/* RIGHT */}
        <div className="space-y-6">

          {/* Topic Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center gap-3 mb-5">

              <BookOpen className="text-green-400" />

              <h2 className="text-xl font-semibold">

                Topic-Wise Summary

              </h2>

            </div>

            <div className="text-slate-300 leading-7 whitespace-pre-wrap max-h-[300px] overflow-y-auto">

              {
                topicSummary ||

                "Upload a lecture to generate topic summaries."
              }

            </div>

          </div>


          {/* Live Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-5">

              <div className="flex items-center gap-3">

                <Clock className="text-yellow-400" />

                <h2 className="text-xl font-semibold">

                  Live Lecture Summary

                </h2>

              </div>

              <button

                onClick={fetchLast5MinSummary}

                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl"

              >

                Refresh

              </button>

            </div>

            <div className="text-slate-300 leading-8 whitespace-pre-wrap">

              {
                last5Summary ||

                "AI will summarize the current lecture section automatically."
              }

            </div>

          </div>


          {/* Quiz */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-5">

              <div className="flex items-center gap-3">

                <FileQuestion className="text-pink-400" />

                <h2 className="text-xl font-semibold">

                  AI Quiz Generator

                </h2>

              </div>

              <button
                disabled={loading}
                onClick={generateQuiz}

                className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-xl"
              >

                Generate

              </button>

            </div>

            <div className="space-y-4 max-h-[450px] overflow-y-auto">

              {
                Array.isArray(quiz) &&
                quiz.map((item, index) => (

                  <div
                    key={index}
                    className="bg-slate-800 p-5 rounded-2xl border border-slate-700"
                  >

                    <p className="font-semibold mb-5 text-lg">

                      Q{index + 1}. {item.question}

                    </p>

                    <div className="space-y-3">

                      {
                        item.options?.map((option, idx) => {

                          const isSelected =
                            selectedAnswers[index] === option;

                          const isCorrect =
                            option === item.correct_answer;

                          const showCorrect =
                            showResults && isCorrect;

                          const showWrong =
                            showResults &&
                            isSelected &&
                            !isCorrect;

                          return (

                            <button
                              key={idx}

                              onClick={() =>
                                selectAnswer(index, option)
                              }

                              className={`

                                w-full text-left p-4 rounded-xl border transition-all

                                ${isSelected
                                  ? "bg-blue-600 border-blue-400"
                                  : "bg-slate-700 border-slate-600"
                                }

                                ${showCorrect
                                  ? "!bg-green-600 !border-green-400"
                                  : ""
                                }

                                ${showWrong
                                  ? "!bg-red-600 !border-red-400"
                                  : ""
                                }

                              `}
                            >

                              {option}

                            </button>
                          );
                        })
                      }

                    </div>

                    {
                      showResults && (

                        <div className="mt-5 text-green-400">

                          Correct Answer:
                          {" "}
                          {item.correct_answer}

                        </div>
                      )
                    }

                  </div>
                ))
              }

              {
                quiz.length > 0 &&
                !showResults && (

                  <button
                    onClick={submitQuiz}

                    className="w-full mt-5 bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-semibold"
                  >

                    Submit Quiz

                  </button>
                )
              }

              {
                showResults && (

                  <div className="mt-6 bg-green-500/20 border border-green-500 p-5 rounded-2xl">

                    <h3 className="text-2xl font-bold text-green-400">

                      Your Score:
                      {" "}
                      {score} / {quiz.length}

                    </h3>

                  </div>
                )
              }

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default App;

