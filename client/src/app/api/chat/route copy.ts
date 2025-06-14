import { NextRequest } from "next/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const result = streamText({
      model: google("gemini-2.0-flash-lite"),
      messages,
    });
    return result.toDataStreamResponse();
  } catch (e) {
    console.error("[DEBUG] streamText/googleでエラー", e);
    return new Response("streamText/googleでエラー: " + String(e), { status: 500 });
  }
}

