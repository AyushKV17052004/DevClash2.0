import { useState } from "react";
import {
  Video,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  Link2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { API_BASE } from "../../config/api";

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

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

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
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="mb-2">
        <h1 className="text-3xl font-semibold text-white mb-2">Video Summarizer</h1>
        <p className="text-gray-400">
          Paste a YouTube link. We fetch captions when available (InnerTube + fallback),
          then Gemini summarizes in a concise, structured way — same API stack as AI Tutor.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">YouTube URL</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Link2 className="w-3.5 h-3.5" />
                Supports watch, youtu.be, shorts, embed — needs captions on the video.
              </div>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSummarize();
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />

              {error && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
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
                className={`
                  w-full py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-medium
                  ${
                    videoUrl.trim() && !isProcessing
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fetching transcript & summarizing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Summarize with Gemini
                  </>
                )}
              </button>
            </div>
          </div>

          {result && (
            <>
              <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-white pr-4">
                    {result.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 shrink-0">
                    {result.transcriptChars ? (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {result.transcriptChars.toLocaleString()} chars transcript
                      </span>
                    ) : null}
                    {result.transcriptSource ? (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {result.transcriptSource}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {result.summary}
                </div>
              </div>

              {result.concepts.length > 0 && (
                <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Concepts</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.concepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full text-sm text-purple-200"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.keyPoints.length > 0 && (
                <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Key points</h3>
                  <ul className="space-y-2">
                    {result.keyPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 text-sm text-gray-300 leading-relaxed"
                      >
                        <span className="text-purple-400 font-mono text-xs shrink-0 w-6">
                          {idx + 1}.
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">How it works</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <p>
                  Captions are loaded via YouTube&apos;s APIs when the video has
                  subtitles (auto-generated or manual).
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <p>
                  If one method is blocked, the server tries a second caption source
                  before failing.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p>
                  Long videos use the start of the transcript; very long transcripts
                  are truncated for the model.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-medium text-white mb-2">Tip</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Educational talks and lectures with clear audio usually have good auto
              captions. Music-only or private videos may not work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
