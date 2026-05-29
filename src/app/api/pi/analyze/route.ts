import { NextResponse } from "next/server";
import { analyzePptx } from "@/lib/pi/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 40 * 1024 * 1024; // 40 MB
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 40 MB." }, { status: 413 });
    }
    const name = file.name.toLowerCase();
    if (file.type !== PPTX_MIME && !name.endsWith(".pptx")) {
      return NextResponse.json(
        { error: "Only .pptx files are supported (legacy .ppt: re-save as .pptx)." },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzePptx(buffer);
    return NextResponse.json({ filename: file.name, ...result });
  } catch (err) {
    console.error("PI analyze error:", err);
    return NextResponse.json(
      { error: "Could not analyze this presentation. It may be corrupt or password-protected." },
      { status: 422 }
    );
  }
}
