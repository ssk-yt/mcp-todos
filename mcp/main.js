import { Hono } from "hono";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSETransport } from "hono-mcp-server-sse-transport";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
const app = new Hono();
const mcpServer = new McpServer({
    name: "todo-mcp-server",
    version: "1.0.0"
});
// ツールの登録
async function addTodoItem(title) {
    try {
        const response = await fetch(process.env.API_SERVER_URL + "/todos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title
            })
        });
        if (!response.ok) {
            console.error(`[addTodoItem] APIサーバーからエラー: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    }
    catch (e) {
        console.error(`[addTodoItem AOIサーバーとの通信でエラー: ${e}]`);
        return null;
    }
}
mcpServer.tool("addTodoItem", "Add a new todo item", {
    title: z.string().min(1)
}, async ({ title }) => {
    const todoItem = await addTodoItem(title);
    return {
        content: [
            {
                type: "text",
                text: `${title}を追加しました`
            }
        ]
    };
});
async function deleteTodoItem(id) {
    try {
        console.log(`[deleteTodoItem] APIサーバーにリクエスト: ${id}`);
        const response = await fetch(`http://localhost:8080/todos/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            console.error(`[deleteTodoItem] APIサーバーからエラー: ${response.status} ${response.status}`);
            return false;
        }
        return true;
    }
    catch (e) {
        console.error(`[deleteTodoItem] APIサーバーとの通信でエラー: ${e}`);
        return false;
    }
}
mcpServer.tool("deleteTodoItem", "Delete a todo item", {
    id: z.number()
}, async ({ id }) => {
    const success = deleteTodoItem(id);
    return {
        content: [
            {
                type: "text",
                text: `${id}を削除しました`
            },
        ],
    };
});
async function updateTodoItem(id, completed) {
    try {
        const response = await fetch(`http://localhost:8080/todos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                completed,
            })
        });
        if (!response.ok) {
            console.error(`[updateTodoItem] APIサーバーからエラー: ${response.status} ${response.statusText}`);
            return false;
        }
        return true;
    }
    catch (e) {
        console.error(`[updateTodoItem] APIサーバーとの通信でエラー: ${e}`);
        return false;
    }
}
mcpServer.tool("updateToolItem", "Update a todo item", {
    id: z.number(),
    completed: z.boolean(),
}, async ({ id, completed }) => {
    updateTodoItem(id, completed);
    return {
        content: [
            {
                type: "text",
                text: `${id}を更新しました`,
            },
        ],
    };
});
let transports = {};
app.get("/sse", (c) => {
    console.log("[SSE] /sse endpoint accessed from:", c.req.header("origin") || "unknown origin");
    return streamSSE(c, async (stream) => {
        try {
            console.log("[SSE] Starting new SSE connection");
            const transport = new SSETransport("/messages", stream);
            console.log(`[SSE] New SSETransport created: sessionId=${transport.sessionId}`);
            transports[transport.sessionId] = transport;
            console.log(`[SSE] Transport registered: sessionId=${transport.sessionId}`);
            // 接続が確立されたことを示す初期メッセージを送信
            try {
                await stream.write(new TextEncoder().encode(JSON.stringify({ type: "connected", sessionId: transport.sessionId })));
                console.log(`[SSE] Initial connection message sent: sessionId=${transport.sessionId}`);
            }
            catch (e) {
                console.error(`[SSE] Failed to send initial connection message:`, e);
            }
            stream.onAbort(() => {
                console.log(`[SSE] Connection aborted: sessionId = ${transport.sessionId}`);
                delete transports[transport.sessionId];
            });
            console.log(`[SSE] Attempting to connect MCP server: sessionId=${transport.sessionId}`);
            await mcpServer.connect(transport);
            console.log(`[SSE] MCP server connected successfully: sessionId = ${transport.sessionId}`);
            // 接続が確立されたことを示すメッセージを送信
            try {
                await stream.write(new TextEncoder().encode(JSON.stringify({ type: "ready", sessionId: transport.sessionId })));
                console.log(`[SSE] Ready message sent: sessionId=${transport.sessionId}`);
            }
            catch (e) {
                console.error(`[SSE] Failed to send ready message:`, e);
            }
            while (true) {
                await stream.sleep(10000);
                console.log(`[SSE] Connection alive: sessionId = ${transport.sessionId}`);
                // 定期的な接続確認メッセージを送信
                try {
                    await stream.write(new TextEncoder().encode(JSON.stringify({ type: "ping", sessionId: transport.sessionId })));
                    console.log(`[SSE] Ping message sent: sessionId=${transport.sessionId}`);
                }
                catch (e) {
                    console.error(`[SSE] Failed to send ping message:`, e);
                    break; // エラーが発生したらループを抜ける
                }
            }
        }
        catch (e) {
            console.error(`[SSE] Error in SSE connection:`, e);
            if (e instanceof Error) {
                console.error(`[SSE] Error stack:`, e.stack);
            }
        }
    });
});
app.post("/message", async (c) => {
    const sessionId = c.req.query("sessionId");
    const transport = transports[sessionId ?? ""];
    if (!transport) {
        return c.text("No transport found for sessionId", 400);
    }
    return transport.handlePostMessage(c);
});
serve({
    fetch: app.fetch,
    port: process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT) : 3001,
});
console.log("[MCP] サーバーがポート3001で起動しました");
