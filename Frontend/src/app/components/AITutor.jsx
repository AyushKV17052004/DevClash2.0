import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  BookOpen,
  ExternalLink,
  ImagePlus,
  X,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { API_BASE } from "../../config/api";

/** Strip common Markdown noise so replies read cleanly in plain text. */
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
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi — I'm glad you're here. Ask me anything you're stuck on, or attach a photo of a problem and I'll walk you through it in simple, plain language.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  /** @type {{ preview: string; base64: string; mimeType: string } | null} */
  const [attachment, setAttachment] = useState(null);
  const fileRef = useRef(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(Boolean(SR));
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  const toggleVoiceAsk = useCallback(() => {
    setVoiceError(null);
    if (listening) {
      stopListening();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input isn’t supported in this browser. Try Chrome or Edge.");
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
      if (text) {
        setInput((prev) => {
          const base = prev.trim();
          return base ? `${base} ${text}` : text;
        });
      }
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

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

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
  ];

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Please use an image under 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const comma = dataUrl.indexOf(",");
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      setAttachment({
        preview: dataUrl,
        base64,
        mimeType: file.type || "image/png",
      });
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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    const toSend = attachment;
    setAttachment(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text || "",
          imageBase64: toSend?.base64 || "",
          mimeType: toSend?.mimeType || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      const assistantMessage = {
        role: "assistant",
        content: stripAssistantMarkup(data.answer) || "I couldn't produce an answer just now — try asking again in a moment.",
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Something went wrong on our side: ${err.message || "please try again in a moment."}`,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">AI Tutor</h1>
        <p className="text-gray-400">
          Share a question or a screenshot — answers are written in plain, friendly
          language without messy formatting.
          {voiceSupported && (
            <span className="block mt-1 text-xs text-gray-500">
              Use the mic to dictate your question (Chrome / Edge recommended).
            </span>
          )}
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden min-h-0">
        <div className="lg:col-span-3 flex flex-col bg-[#1a1a2e] rounded-xl border border-white/10 shadow-lg overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl p-4 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                      : "bg-white/5 text-white border border-white/10"
                  }`}
                >
                  {message.imagePreview && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-white/20 max-h-48">
                      <img
                        src={message.imagePreview}
                        alt="Your attachment"
                        className="max-w-full max-h-48 object-contain bg-black/20"
                      />
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>

                  {message.sources?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-400 mb-2">Sources:</p>
                      {message.sources.map((source, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-blue-400"
                        >
                          <BookOpen className="w-3 h-3" />
                          {source}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Putting together an answer…
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 shrink-0">
            {attachment && (
              <div className="mb-3 flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="relative rounded-md overflow-hidden border border-white/10 max-h-24">
                  <img
                    src={attachment.preview}
                    alt="Preview"
                    className="max-h-24 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Image attached</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Add a short question below, or send image only for auto-detect.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1 rounded hover:bg-white/10 text-gray-400"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {voiceError && (
              <p className="mb-2 text-xs text-amber-400" role="alert">
                {voiceError}
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
                className="shrink-0 p-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                title="Attach image"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceAsk}
                  disabled={loading}
                  className={`shrink-0 p-3 rounded-lg border text-white disabled:opacity-50 transition-colors ${
                    listening
                      ? "bg-red-500/25 border-red-500/50 ring-2 ring-red-500/30 animate-pulse"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                  title={listening ? "Stop listening" : "Voice ask — speak your question"}
                >
                  {listening ? (
                    <MicOff className="w-5 h-5 text-red-300" />
                  ) : (
                    <Mic className="w-5 h-5 text-gray-300" />
                  )}
                </button>
              )}

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask your doubt… (Shift+Enter for new line). Optional: attach a photo."
                rows={2}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none min-h-[44px]"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  loading || (!input.trim() && !attachment)
                }
                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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

        <div className="space-y-4 overflow-y-auto">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6">
            <h2 className="text-lg text-white mb-4">Quick questions</h2>
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInput(q)}
                className="block w-full text-left p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/5"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
