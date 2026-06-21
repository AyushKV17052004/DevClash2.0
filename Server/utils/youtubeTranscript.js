/**
 * YouTube transcript utilities — InnerTube player API + caption XML,
 * with ytdl-core fallback (no fragile npm ESM/CJS interop).
 */

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const ANDROID_UA =
  "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const CLIENT_VER = "20.10.38";

/**
 * Extract 11-char YouTube video id from common URL shapes.
 */
export function extractVideoId(input) {
  const s = String(input || "").trim();
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse srv3 / timedtext XML into plain text lines.
 */
function parseCaptionXml(xml) {
  const parts = [];
  const reText = /<text[^>]*>([^<]*)<\/text>/gi;
  let m;
  while ((m = reText.exec(xml)) !== null) {
    const t = decodeEntities(m[1]);
    if (t) parts.push(t);
  }
  if (parts.length > 0) return parts.join(" ");

  const reP = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = reP.exec(xml)) !== null) {
    const inner = m[1].replace(/<[^>]+>/g, " ");
    const t = decodeEntities(inner);
    if (t) parts.push(t);
  }
  return parts.join(" ");
}

async function fetchCaptionXml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": ANDROID_UA,
      "Accept-Language": "en",
    },
  });
  if (!res.ok) throw new Error(`Caption HTTP ${res.status}`);
  return res.text();
}

/**
 * Primary: YouTube InnerTube player → caption tracks → timedtext XML.
 */
async function fetchViaInnerTube(videoId) {
  const res = await fetch(PLAYER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_UA,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: CLIENT_VER,
        },
      },
      videoId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Player API ${res.status}`);
  }

  const data = await res.json();
  const tracks =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No caption tracks in player response");
  }

  const track =
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => (t.kind || "").includes("asr")) ||
    tracks[0];

  const baseUrl = track?.baseUrl;
  if (!baseUrl || !String(baseUrl).includes("youtube.com")) {
    throw new Error("Invalid caption URL");
  }

  const xml = await fetchCaptionXml(baseUrl);
  const text = parseCaptionXml(xml);
  if (!text || text.length < 30) {
    throw new Error("Parsed caption text too short");
  }

  return { text, source: "innertube" };
}

/**
 * Fallback: ytdl-core player_response captions.
 */
async function fetchViaYtdlCaptions(videoId) {
  const ytdl = (await import("ytdl-core")).default;
  if (!ytdl.validateID(videoId)) throw new Error("Invalid video id");
  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
  const tracks =
    info.player_response?.captions?.playerCaptionsTracklistRenderer
      ?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No caption tracks on video");
  }
  const track =
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => (t.kind || "").includes("asr")) ||
    tracks[0];
  const baseUrl = track?.baseUrl;
  if (!baseUrl) throw new Error("No caption URL");

  const xml = await fetchCaptionXml(baseUrl);
  const text = parseCaptionXml(xml);
  if (!text || text.length < 20) {
    throw new Error("Parsed captions empty");
  }
  return { text, source: "ytdl-captions" };
}

/**
 * Try multiple strategies to get transcript text.
 */
export async function getYoutubeTranscriptPlainText(urlOrId) {
  const id =
    extractVideoId(urlOrId) ||
    (/^[a-zA-Z0-9_-]{11}$/.test(String(urlOrId).trim())
      ? String(urlOrId).trim()
      : null);

  if (!id) {
    throw new Error("Could not parse a YouTube video ID from the link.");
  }

  try {
    return await fetchViaInnerTube(id);
  } catch (e1) {
    console.warn("[transcript] InnerTube failed:", e1?.message || e1);
    try {
      return await fetchViaYtdlCaptions(id);
    } catch (e2) {
      console.warn("[transcript] ytdl fallback failed:", e2?.message || e2);
      throw new Error(
        "Could not load captions. Use a public video with captions/subtitles (not private or age-gated). Short links youtu.be/ID also work."
      );
    }
  }
}
