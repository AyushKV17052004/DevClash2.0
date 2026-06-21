import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Send,
  Bot,
  User,
  BookOpen,
  ExternalLink,
  ImagePlus,
  X,
  Mic,
  MicOff,
} from "lucide-react";
import { API_BASE } from "../../config/api";
import { appendTutorMessage } from "../../redux/persistedSlice";
import { AILoader } from "./AILoader";

function stripAssistantMarkup(text) {
  if (text == null || text === "") return "";
  let s = String(text);
  s = s.replace(/^```[\w-]*\n?/gm, "").replace(/\n```/g, "\n");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/\*([^*\n]+)\*/g, "$1");
  s = s.replace(/\*\*/g, "");
  s = s.replace(/^(\s*)[*•]\s+/gm, "$1- ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function AITutor() {
  const dispatch = useDispatch();
  const messages = useSelector((state) => Array.isArray(state.persisted?.tutorChatHistory) ? state.persisted.tutorChatHistory : []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileRef = useRef(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleVoiceAsk = useCallback(() => {
    setVoiceError(null);
    if (listening) { stopListening(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript || "")
        .join(" ")
        .trim();
      if (text) setInput((prev) => { const base = prev.trim(); return base ? `${base} ${text}` : text; });
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceError("Microphone permission denied. Allow mic in your browser settings.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        setVoiceError(e.message || `Voice error: ${e.error}`);
      }
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    try {
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch (err) {
      setVoiceError(err?.message || "Could not start voice input.");
      recognitionRef.current = null;
      setListening(false);
    }
  }, [listening, stopListening]);

  const sampleQuestions = [
    "Explain derivatives in simple terms",
    "What is Newton's Third Law?",
    "Explain photosynthesis step by step",
    "How does osmosis work?",
    "Explain integration by parts",
  ];

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { alert("Please use an image under 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const comma = dataUrl.indexOf(",");
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      setAttachment({ preview: dataUrl, base64, mimeType: file.type || "image/png" });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !attachment) return;
    const userMessage = {
      role: "user",
      content: text || "(Image only — please explain or solve what is shown.)",
      imagePreview: attachment?.preview || null,
    };
    dispatch(appendTutorMessage(userMessage));
    setInput("");
    const toSend = attachment;
    setAttachment(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text || "",
          imageBase64: toSend?.base64 || "",
          mimeType: toSend?.mimeType || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      dispatch(
        appendTutorMessage({
          role: "assistant",
          content:
            stripAssistantMarkup(data.answer) ||
            "I couldn't produce an answer just now — try asking again in a moment.",
          sources: data.sources || [],
        })
      );
    } catch (err) {
      dispatch(
        appendTutorMessage({
          role: "assistant",
          content: `Something went wrong: ${err.message || "please try again in a moment."}`,
          sources: [],
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="mb-5 flex items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ background: "#1B2540" }}
            />
            <h1
              className="text-2xl font-black text-foreground"
              style={{ fontFamily: "'Merriweather', Georgia, serif" }}
            >
              Doubt Solver
            </h1>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
              style={{
                background: "#1B2540",
                color: "#fff",
                borderRadius: "2px",
              }}
            >
              JEE · NEET · UPSC
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-4">
            Share a question or a screenshot — plain language, no jargon.
            {voiceSupported && (
              <span className="ml-2 text-xs text-muted-foreground/70">
                🎤 Mic available
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-5 overflow-hidden min-h-0">
        {/* Chat panel */}
        <div
          className="lg:col-span-3 flex flex-col overflow-hidden min-h-0"
          style={{
            border: "2px solid var(--border-hard)",
            borderRadius: "4px",
            background: "var(--card)",
          }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.filter(msg => msg && typeof msg === "object").map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message?.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message?.role === "assistant" && (
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "#1B2540", borderRadius: "4px" }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className="max-w-[80%] p-4 text-sm leading-relaxed"
                  style={
                    message?.role === "user"
                      ? {
                          background: "#C0392B",
                          color: "#fff",
                          borderRadius: "4px 4px 0 4px",
                          border: "2px solid #C0392B",
                        }
                      : {
                          background: "var(--card)",
                          color: "var(--foreground)",
                          borderRadius: "4px 4px 4px 0",
                          border: "2px solid var(--border-hard)",
                        }
                  }
                >
                  {message?.imagePreview && (
                    <div
                      className="mb-3 overflow-hidden max-h-48"
                      style={{
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderRadius: "2px",
                      }}
                    >
                      <img
                        src={message.imagePreview}
                        alt="Your attachment"
                        className="max-w-full max-h-48 object-contain"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message?.content}</p>

                  {message?.sources?.length > 0 && (
                    <div
                      className="mt-3 pt-3"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                      {message.sources.map((source, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#2471A3" }}>
                          <BookOpen className="w-3 h-3" />
                          {source}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message?.role === "user" && (
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "#1B2540", borderRadius: "4px" }}
                  >
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && <AILoader />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="p-4 shrink-0"
            style={{ borderTop: "2px solid var(--border-hard)" }}
          >
            {attachment && (
              <div
                className="mb-3 flex items-start gap-3 p-3"
                style={{
                  border: "2px solid var(--border-hard)",
                  borderRadius: "4px",
                  background: "var(--muted)",
                }}
              >
                <div
                  className="overflow-hidden max-h-24"
                  style={{ borderRadius: "2px", border: "1px solid var(--border)" }}
                >
                  <img
                    src={attachment.preview}
                    alt="Preview"
                    className="max-h-24 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Image attached</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a question below, or send image only for auto-detect.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1 hover:text-[#C0392B] text-muted-foreground transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {voiceError && (
              <p className="mb-2 text-xs text-[#E67E22] font-medium" role="alert">
                ⚠ {voiceError}
              </p>
            )}

            <div className="flex gap-2 items-end">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePickImage}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="shrink-0 p-3 disabled:opacity-50 text-muted-foreground hover:text-foreground transition-colors"
                style={{
                  border: "2px solid var(--border-hard)",
                  borderRadius: "4px",
                }}
                title="Attach image"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceAsk}
                  disabled={loading}
                  className={`shrink-0 p-3 disabled:opacity-50 text-white transition-colors ${
                    listening ? "animate-pulse" : ""
                  }`}
                  style={{
                    background: listening ? "#C0392B" : "#1B2540",
                    border: `2px solid ${listening ? "#C0392B" : "var(--border-hard)"}`,
                    borderRadius: "4px",
                  }}
                  title={listening ? "Stop listening" : "Voice input"}
                >
                  {listening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              )}

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask your doubt… (Shift+Enter for new line)"
                rows={2}
                className="flex-1 px-4 py-3 resize-none text-sm focus:outline-none min-h-[44px]"
                style={{
                  background: "var(--card)",
                  border: "2px solid var(--border-hard)",
                  borderRadius: "4px",
                  color: "var(--foreground)",
                }}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={loading || (!input.trim() && !attachment)}
                className="px-5 py-3 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:translate-y-0.5"
                style={{
                  background: "#C0392B",
                  borderRadius: "4px",
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — quick questions */}
        <div className="space-y-4 overflow-y-auto">
          <div
            style={{
              border: "2px solid var(--border-hard)",
              borderRadius: "4px",
              background: "var(--card)",
              padding: "1.25rem",
            }}
          >
            <h2
              className="text-sm font-black text-foreground mb-4 uppercase tracking-wider"
              style={{ fontFamily: "'Merriweather', Georgia, serif" }}
            >
              Quick questions
            </h2>
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInput(q)}
                className="block w-full text-left p-2.5 text-sm text-muted-foreground hover:text-foreground rounded-sm transition-colors hover:bg-[#C0392B]/8 font-medium"
                style={{ borderBottom: i < sampleQuestions.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                {q}
              </button>
            ))}
          </div>

          <div
            style={{
              border: "2px solid #1B2540",
              borderRadius: "4px",
              background: "#1B2540",
              padding: "1rem",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[#C0392B] mb-1">💡 Tip</p>
            <p className="text-xs text-white/70 leading-relaxed">
              You can attach a photo of your textbook question or handwritten problem — I'll solve it step by step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
