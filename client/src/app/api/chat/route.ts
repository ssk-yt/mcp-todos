import { NextRequest } from "next/server";
import { 
    experimental_createMCPClient as createMcpClient,
    streamText
} from "ai";
import { google } from "@ai-sdk/google"

export async function POST(req: NextRequest) {
  console.log("API requested")
  const mcpClient = await createMcpClient({
    transport: {
      type: "sse",
      url: "http://localhost:3001/sse",
    },
  });

  const { messages } = await req.json();
  const tools = await mcpClient.tools();

  const result = streamText({
    model: google("gemini-1.5-pro-latest"),
    messages,
    tools,
    onFinish: () => {
      mcpClient.close();
    },
  });

  return result.toDataStreamResponse();
}