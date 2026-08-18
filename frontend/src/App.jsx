
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
  ExternalLink,
} from "lucide-react";

import {
  useRef,
  useState,
  useEffect,
} from "react";

import axios from "axios";
import PDFViewer from "./PDFViewer";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {

  const videoRef = useRef(null);

  const [activeView, setActiveView] = useState("landing");
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [pdfMetadata, setPdfMetadata] = useState(null);

  const [pdfViewerURL, setPdfViewerURL] = useState("");
  const [pdfActivePage, setPdfActivePage] = useState(1);

  const navigateTo = (viewName) => {
    setActiveView(viewName);
    setError("");
    setUploadMessage("");
    setQuestion("");
    setAnswer("");
    setSources([]);
    setPdfActivePage(1);
  };

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

      // Reset previous session states
      setAnswer("");
      setSources([]);
      setTopicSummary("");
      setLast5Summary("");
      setQuiz([]);
      setScore(0);
      setShowResults(false);
      setSelectedAnswers({});

      setProcessingStep(
        "Uploading video..."
      );

      const response = await axios.post(
        `${API_BASE_URL}/upload-video`,

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

      setVideoMetadata({
        name: videoFile.name,
        size: (videoFile.size / 1024 / 1024).toFixed(2) + " MB",
        chunks: response.data.chunks_created || 0,
      });

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

        `${API_BASE_URL}/upload-pdf`,

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

      setPdfMetadata({
        name: pdfFile.name,
        size: (pdfFile.size / 1024 / 1024).toFixed(2) + " MB",
        pages: response.data.pages || 0,
        chunks: response.data.chunks_created || 0,
      });

      const localBlobURL = URL.createObjectURL(pdfFile);
      setPdfViewerURL(localBlobURL);
      setPdfActivePage(1);

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
        `${API_BASE_URL}/chat`,
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
        `${API_BASE_URL}/topic-summary`
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
        `${API_BASE_URL}/last-5-min-summary`,
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
        `${API_BASE_URL}/generate-quiz`,
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

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo("landing")}>

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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo("landing")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeView === "landing"
                  ? "bg-slate-800 text-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo("video")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeView === "video"
                  ? "bg-slate-800 text-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              Video RAG
            </button>
            <button
              onClick={() => navigateTo("pdf")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeView === "pdf"
                  ? "bg-slate-800 text-purple-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              PDF RAG
            </button>
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


      {/* LANDING VIEW */}
      {activeView === "landing" && (
        <div>
          {/* Premium Hero Section */}
          <div className="relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full"></div>

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
                      Lectures & Texts
                    </span>
                    <br />
                    Into
                    <span className="bg-gradient-to-r from-pink-400 to-orange-400 text-transparent bg-clip-text">
                      {" "}
                      Active Knowledge
                    </span>
                  </h1>

                  {/* Subtitle */}
                  <p className="text-slate-300 text-xl leading-9 mb-10 max-w-2xl">
                    Upload lecture videos or study PDFs, ask AI-powered doubts,
                    jump to exact timestamps, generate quizzes, and get live
                    summaries — all in one integrated assistant.
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap gap-5">
                    <button
                      onClick={() => navigateTo("video")}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:scale-105 transition-all shadow-2xl shadow-blue-500/20"
                    >
                      Explore Video RAG
                    </button>
                    <button
                      onClick={() => navigateTo("pdf")}
                      className="bg-slate-900 border border-slate-750 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-slate-800 transition-all hover:border-slate-500"
                    >
                      Explore PDF RAG
                    </button>
                  </div>
                </div>

                {/* RIGHT SIDE SPECIFICATION CARD */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl rounded-[40px]"></div>
                  <div className="relative bg-slate-900/90 border border-slate-800 rounded-[40px] p-8 backdrop-blur-2xl shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <Brain size={30} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">LMS Specifications</h2>
                        <p className="text-slate-400">Integrated Intelligence Features</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-slate-800/50 border border-slate-750 rounded-2xl p-5 flex items-start gap-4 hover:border-blue-500 transition-all">
                        <MessageSquare className="text-blue-400 mt-1" />
                        <div>
                          <h3 className="font-semibold text-lg">AI Video Doubt Solving</h3>
                          <p className="text-slate-400 mt-1 text-sm leading-6">
                            Interact with video transcripts, generate topic summaries, and navigate exactly using timestamp markers.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 border border-slate-750 rounded-2xl p-5 flex items-start gap-4 hover:border-purple-500 transition-all">
                        <FileText className="text-purple-400 mt-1" />
                        <div>
                          <h3 className="font-semibold text-lg">Smart PDF Ingestion</h3>
                          <p className="text-slate-400 mt-1 text-sm leading-6">
                            Upload documents and textbooks, chunk pages semantically, and retrieve page-referenced answers instantly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Launcher Grid */}
          <div className="max-w-7xl mx-auto px-6 pb-20">
            <h2 className="text-3xl font-bold text-center mb-10">Select Your Study Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div 
                onClick={() => navigateTo("video")}
                className="group cursor-pointer rounded-3xl bg-slate-900 border border-slate-800 p-8 hover:border-blue-500 transition-all hover:scale-[1.01]"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-all">
                  <PlayCircle size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors">Video RAG Workspace</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Extract learning summaries, review transcripts, generate multiple-choice quizzes, and get answer links that play the video from precise timestamps.
                </p>
                <span className="text-blue-400 font-semibold flex items-center gap-2 text-sm">
                  Launch Video Workspace →
                </span>
              </div>

              <div 
                onClick={() => navigateTo("pdf")}
                className="group cursor-pointer rounded-3xl bg-slate-900 border border-slate-800 p-8 hover:border-purple-500 transition-all hover:scale-[1.01]"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-all">
                  <FileText size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-400 transition-colors">PDF RAG Workspace</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Ingest study documents, notes, or textbooks, build vector databases, and perform deep semantic Q&A with exact document page references.
                </p>
                <span className="text-purple-400 font-semibold flex items-center gap-2 text-sm">
                  Launch PDF Workspace →
                </span>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* VIDEO RAG VIEW */}
      {activeView === "video" && (
        <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigateTo("landing")}
              className="bg-slate-900 border border-slate-800 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all hover:border-slate-650 hover:bg-slate-850"
            >
              ← Back to Home
            </button>
            <h2 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              Video RAG Workspace
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Upload, Smart Player, Chat */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Video Upload */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <Upload className="text-blue-400" />
                  <h2 className="text-2xl font-semibold">Upload Lecture Video</h2>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setVideoFile(file);
                        setVideoURL(URL.createObjectURL(file));
                        setVideoMetadata(null);
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-slate-300"
                  />
                  <button
                    disabled={loading}
                    onClick={handleUpload}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-2xl font-semibold hover:opacity-90 transition-all text-white disabled:opacity-50"
                  >
                    Upload & Process
                  </button>
                </div>
                {loading && (
                  <div className="mt-6">
                    <div className="flex justify-between mb-2 text-sm text-slate-300">
                      <span>{processingStep}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {uploadMessage && !loading && (
                  <div className="mt-4 text-green-400 text-sm font-medium">
                    ✓ {uploadMessage}
                  </div>
                )}
              </div>

              {/* Video Metadata Stats */}
              {videoMetadata && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap gap-6 items-center justify-between">
                  <div>
                    <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Active Lecture</h4>
                    <p className="text-lg font-bold text-slate-200 mt-1 truncate max-w-md">{videoMetadata.name}</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">File Size</h4>
                      <p className="text-lg font-bold text-blue-400 mt-1">{videoMetadata.size}</p>
                    </div>
                    <div>
                      <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Semantic Chunks</h4>
                      <p className="text-lg font-bold text-purple-400 mt-1">{videoMetadata.chunks}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Player */}
              {videoURL && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <PlayCircle className="text-blue-400" />
                    <h2 className="text-2xl font-semibold">Smart Lecture Player</h2>
                  </div>
                  <video
                    ref={videoRef}
                    controls
                    className="w-full rounded-2xl"
                    src={videoURL}
                  />
                  <div className="mt-3 text-slate-400 text-sm">
                    Ask doubts below and jump directly to relevant video timestamps.
                  </div>
                </div>
              )}

              {/* Chat interface */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <MessageSquare className="text-purple-400" />
                  <h2 className="text-2xl font-semibold">Video AI Tutor Chat</h2>
                </div>
                <textarea
                  rows="4"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about the video lecture..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 outline-none text-slate-200 resize-none focus:border-blue-500 transition-colors"
                />
                <button
                  disabled={loading || !question}
                  onClick={askQuestion}
                  className="mt-5 bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-4 rounded-2xl font-semibold hover:opacity-95 active:scale-95 transition-all text-white disabled:opacity-50"
                >
                  Ask Video Tutor
                </button>

                {answer && (
                  <div className="mt-6 bg-slate-800 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-blue-400 mb-4">AI Answer</h3>
                    <p className="text-slate-200 leading-8 whitespace-pre-wrap">{answer}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {Array.isArray(sources) &&
                        sources.map((source, index) => (
                          <div key={index}>
                            {source.type === "video" && (
                              <button
                                onClick={() => jumpToTimestamp(source.start_time)}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                              >
                                Jump to {formatTime(source.start_time)}
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: summaries & quizzes */}
            <div className="space-y-6">
              
              {/* Topic summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <BookOpen className="text-green-400" />
                  <h2 className="text-xl font-semibold">Topic-Wise Summary</h2>
                </div>
                <div className="text-slate-300 leading-7 whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2">
                  {topicSummary || "Upload a video to generate topic summaries."}
                </div>
              </div>

              {/* Live Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Clock className="text-yellow-400" />
                    <h2 className="text-xl font-semibold">Live Lecture Summary</h2>
                  </div>
                  <button
                    onClick={fetchLast5MinSummary}
                    className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <div className="text-slate-300 leading-7 whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2">
                  {last5Summary || "AI will summarize the current lecture section automatically."}
                </div>
              </div>

              {/* Quiz generator */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <FileQuestion className="text-pink-400" />
                    <h2 className="text-xl font-semibold">AI Quiz Generator</h2>
                  </div>
                  <button
                    disabled={loading || !videoURL}
                    onClick={generateQuiz}
                    className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>

                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {Array.isArray(quiz) &&
                    quiz.map((item, index) => (
                      <div key={index} className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <p className="font-semibold mb-5 text-base">Q{index + 1}. {item.question}</p>
                        <div className="space-y-3">
                          {item.options?.map((option, idx) => {
                            const isSelected = selectedAnswers[index] === option;
                            const isCorrect = option === item.correct_answer;
                            const showCorrect = showResults && isCorrect;
                            const showWrong = showResults && isSelected && !isCorrect;

                            return (
                              <button
                                key={idx}
                                onClick={() => selectAnswer(index, option)}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm ${
                                  isSelected
                                    ? "bg-blue-600 border-blue-400"
                                    : "bg-slate-700 border-slate-600"
                                } ${
                                  showCorrect ? "!bg-green-600 !border-green-400" : ""
                                } ${
                                  showWrong ? "!bg-red-600 !border-red-400" : ""
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {showResults && (
                          <div className="mt-5 text-green-400 text-sm font-semibold">
                            Correct Answer: {item.correct_answer}
                          </div>
                        )}
                      </div>
                    ))}

                  {quiz.length > 0 && !showResults && (
                    <button
                      onClick={submitQuiz}
                      className="w-full mt-5 bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-semibold transition-all"
                    >
                      Submit Quiz
                    </button>
                  )}

                  {showResults && (
                    <div className="mt-6 bg-green-500/20 border border-green-500 p-5 rounded-2xl">
                      <h3 className="text-xl font-bold text-green-400">
                        Your Score: {score} / {quiz.length}
                      </h3>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* PDF RAG VIEW */}
      {activeView === "pdf" && (
        <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigateTo("landing")}
              className="bg-slate-900 border border-slate-800 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all hover:border-slate-650 hover:bg-slate-850"
            >
              ← Back to Home
            </button>
            <h2 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
              PDF RAG Workspace
            </h2>
          </div>

          {!pdfMetadata ? (
            /* Upload Screen (When no PDF is loaded yet) */
            <div className="max-w-xl mx-auto mt-12">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-3xl bg-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-6">
                    <FileText size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Upload Your Document</h2>
                  <p className="text-slate-400 text-sm">
                    Upload textbooks, research notes, or PDFs to start interactive chat.
                  </p>
                </div>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setPdfFile(file);
                        setPdfMetadata(null);
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-slate-300 text-sm"
                  />
                  <button
                    disabled={loading || !pdfFile}
                    onClick={handlePdfUpload}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-2xl font-semibold transition-all text-white disabled:opacity-50"
                  >
                    {loading ? "Uploading & Chunking..." : "Upload & Analyze PDF"}
                  </button>
                </div>
                {uploadMessage && !loading && (
                  <div className="text-green-400 text-sm font-medium text-center">
                    ✓ {uploadMessage}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Active Workspace Screen (When PDF is loaded) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2/3 width): Native Canvas PDF Viewer (100% Edge/Chrome/HF compatible) */}
              <div className="lg:col-span-2">
                <PDFViewer
                  file={pdfFile}
                  activePage={pdfActivePage}
                  onPageChange={(page) => setPdfActivePage(page)}
                  title={pdfMetadata?.name || "Active Document"}
                />
              </div>

              {/* Right Column (1/3 width): PDF Info & AI Tutor Chat */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Stats Card */}
                {pdfMetadata && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">File Info</h4>
                      <button 
                        onClick={() => {
                          setPdfFile(null);
                          setPdfMetadata(null);
                        }} 
                        className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                      >
                        Change PDF
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800">
                        <div className="text-xs text-slate-400">Size</div>
                        <div className="font-bold text-purple-400 mt-1 text-sm">{pdfMetadata.size}</div>
                      </div>
                      <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800">
                        <div className="text-xs text-slate-400">Pages</div>
                        <div className="font-bold text-purple-400 mt-1 text-sm">{pdfMetadata.pages}</div>
                      </div>
                      <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800">
                        <div className="text-xs text-slate-400">Chunks</div>
                        <div className="font-bold text-pink-400 mt-1 text-sm">{pdfMetadata.chunks}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Tutor Chat Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-[600px]">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
                    <MessageSquare className="text-purple-400" />
                    <h2 className="text-xl font-bold">PDF AI Tutor Chat</h2>
                  </div>
                  
                  <textarea
                    rows="3"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question referencing the uploaded study document..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 outline-none text-slate-200 resize-none focus:border-purple-500 transition-colors text-sm"
                  />
                  
                  <button
                    disabled={loading || !question}
                    onClick={askQuestion}
                    className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-600 py-3.5 rounded-2xl font-semibold hover:opacity-95 active:scale-95 transition-all text-white disabled:opacity-50"
                  >
                    Ask PDF Tutor
                  </button>

                  <div className="flex-grow overflow-y-auto mt-4 space-y-4 pr-1">
                    {answer && (
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-purple-400 mb-2">AI Answer</h3>
                        <p className="text-slate-200 text-sm leading-7 whitespace-pre-wrap">{answer}</p>
                        
                        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-750">
                          {Array.isArray(sources) &&
                            sources.map((source, index) => (
                              <div key={index}>
                                {source.type === "pdf" && (
                                  <button
                                    onClick={() => setPdfActivePage(source.page)}
                                    className="bg-purple-650 hover:bg-purple-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 flex items-center gap-1.5 border border-purple-500"
                                  >
                                    <FileText size={12} />
                                    Go to Page {source.page}
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default App;

