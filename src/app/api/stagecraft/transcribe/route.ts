// POST /api/stagecraft/transcribe
// Accepts multipart/form-data with an "audio" file (webm/opus from MediaRecorder).
// Forwards to OpenAI Whisper and returns { text }.

import { NextRequest } from "next/server";

export const runtime = "nodejs"; // we need the server runtime for file forwarding
export const dynamic = "force-dynamic";

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_MODEL = process.env.STAGECRAFT_WHISPER_MODEL ?? "whisper-1";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch (err) {
    return Response.json(
      { error: "Invalid multipart body.", detail: String(err) },
      { status: 400 },
    );
  }

  const file = incoming.get("audio");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Missing 'audio' file part." },
      { status: 400 },
    );
  }

  // Re-pack into a fresh FormData for OpenAI. Node's fetch supports File/Blob.
  const upstream = new FormData();
  upstream.set("file", file, file.name || "audio.webm");
  upstream.set("model", WHISPER_MODEL);
  upstream.set("response_format", "json");
  upstream.set("language", "en");

  let res: Response;
  try {
    res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
  } catch (err) {
    return Response.json(
      { error: "Whisper request failed.", detail: String(err) },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      { error: "Whisper returned non-2xx.", status: res.status, detail: text },
      { status: 502 },
    );
  }

  const json = (await res.json()) as { text?: string };
  return Response.json({ text: json.text ?? "" });
}
