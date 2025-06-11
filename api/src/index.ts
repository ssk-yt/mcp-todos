import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from "../generated/prisma/index.js";
import { title } from 'process';
import { cors } from "hono/cors"

const app = new Hono()
const prisma = new PrismaClient()

app.use(
  cors({
    origin:"http://localhost:3000"
  })
)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get("/systems/ping", (c) => {
  return c.text("pong")
})

app.get("/todos", async(c) => {
  const todos = await prisma.todo.findMany();
  return c.json(todos);
})

// todo の作製
app.post("/todos", async(c) => {
  const body = await c.req.json();
  const { title } = body;
  if(!title) {
    return c.json({error: "Title is required"}, 400)
  }

  const todo = await prisma.todo.create({
    data: { title }
  })

  return c.json(todo);
})

// todoの更新
app.put("/todos/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const { title, completed } = body;

  try {
    const todo = await prisma.todo.update({
      where: { id }, // 検索する条件：idが一致するもの
      data: { title, completed }, // 何を更新するのか
    })
    return c.json(todo);
  } catch (e) {
    return c.json({ error: "Todo not found"}, 404);
  }
})

// todoの削除
app.delete("/todos/:id", async (c) => {
  const id = Number(c.req.param("id")); 

  try {
    await prisma.todo.delete({
      where: { id }
    });
    return c.json({ success : true}) // 削除成功のメッセージ
  } catch (e) {
    return c.json({ error: "Todo not found"}, 404)
  }
})

serve({
  fetch: app.fetch,
  port: 8080
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
