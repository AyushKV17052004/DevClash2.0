import { useState } from "react";
import { Video, FileText, Clock, CheckCircle, Loader2, Link2, AlertCircle } from "lucide-react";
import { API_BASE } from "../../config/api";
import { AILoader } from "./AILoader";

const CARD = { border: "2px solid var(--border-hard)", borderRadius: "4px", background: "var(--card)", padding: "1.5rem" };

export function VideoSummarizer() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSummarize = async () => {
    const url = videoUrl.trim();
    if (!url) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/summarize-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult({
        title: data.title || "Video",
        summary: data.summary || "",
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        concepts: Array.isArray(data.concepts) ? data.concepts : [],
        transcriptSource: data.transcriptSource,
        transcriptChars: data.transcriptChars,
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl relative overflow-hidden">
      {/* Stickers */}
      <div className="sticker sticker-slow" style={{ top: "4%", right: "2%", fontSize: "2.5rem", "--sticker-rot": "-10deg" }}>🎬</div>
      <div className="sticker sticker-drift" style={{ bottom: "15%", right: "3%", fontSize: "2rem", "--sticker-rot": "8deg", animationDelay: "1.2s" }}>📺</div>

      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: "#C0392B" }} />
          <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            Video Summarizer
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-4">
          Paste a YouTube link — we fetch captions and generate a concise summary with key points.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div style={CARD}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: "#C0392B", borderRadius: "4px" }}>
                <Video className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                YouTube URL
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link2 className="w-3.5 h-3.5" />
                Supports watch, youtu.be, shorts, embed — needs captions on the video.
              </div>

              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSummarize(); }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 text-sm text-foreground outline-none focus:border-[#C0392B] transition-colors"
                style={{
                  background: "var(--input-background)",
                  border: "2px solid var(--border-hard)",
                  borderRadius: "4px",
                }}
              />

              {error && (
                <div
                  className="flex items-start gap-2 px-3 py-2 text-sm"
                  style={{ border: "2px solid #C0392B", borderRadius: "4px", background: "var(--card)", color: "#C0392B" }}
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSummarize}
                disabled={!videoUrl.trim() || isProcessing}
                className="w-full py-3 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90 active:translate-y-0.5"
                style={{ background: "#C0392B", borderRadius: "4px" }}
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Fetching transcript &amp; summarising…</>
                ) : (
                  <>🎬 Summarise video</>
                )}
              </button>
              {isProcessing && (
                <div className="mt-4">
                  <AILoader />
                </div>
              )}
            </div>
          </div>

          {result && (
            <>
              <div style={CARD}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                  <h2 className="text-lg font-bold text-foreground pr-4" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                    {result.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {result.transcriptChars ? (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {result.transcriptChars.toLocaleString()} chars
                      </span>
                    ) : null}
                    {result.transcriptSource ? (
                      <span
                        className="px-2 py-0.5 text-xs font-medium"
                        style={{ border: "1px solid var(--border-hard)", borderRadius: "2px" }}
                      >
                        {result.transcriptSource}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {result.summary}
                </div>
              </div>

              {result.concepts.length > 0 && (
                <div style={CARD}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Concepts</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.concepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-sm font-medium"
                        style={{
                          background: "#2471A3",
                          color: "#fff",
                          borderRadius: "2px",
                        }}
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.keyPoints.length > 0 && (
                <div style={CARD}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Key points</h3>
                  <ul className="space-y-3">
                    {result.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                        <span
                          className="font-black tabular-nums shrink-0 w-6 text-right"
                          style={{ color: "#C0392B" }}
                        >
                          {idx + 1}.
                        </span>
                        <span className="text-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div style={CARD}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">How it works</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#1E8449" }} />
                <p className="text-muted-foreground leading-relaxed">
                  Captions are fetched from YouTube when the video has subtitles (auto-generated or manual).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#1E8449" }} />
                <p className="text-muted-foreground leading-relaxed">
                  If one method is blocked, the server tries a second caption source before failing.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#E67E22" }} />
                <p className="text-muted-foreground leading-relaxed">
                  Very long transcripts are trimmed — only the first portion is summarised.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              border: "2px solid #1B2540",
              borderRadius: "4px",
              background: "#1B2540",
              padding: "1rem",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#C0392B" }}>💡 Tip</p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              Educational talks and lectures with clear audio usually have good auto-captions. Music-only or private videos may not work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
