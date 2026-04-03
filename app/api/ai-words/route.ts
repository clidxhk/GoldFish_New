import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

async function handle() {
  try {
    const filePath = path.join(process.cwd(), "ai_word.txt");
    const content = await fs.readFile(filePath, "utf-8");
    const words = content
      .split(/\r?\n/)
      .map((word) => word.trim())
      .filter(Boolean);

    return NextResponse.json({ words });
  } catch (error) {
    console.error("[ai-words] failed to read ai_word.txt", error);
    return NextResponse.json({ words: [] }, { status: 200 });
  }
}

export const GET = handle;

export const runtime = "nodejs";
