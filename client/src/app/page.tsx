"use client"
import { useQuery } from "@tanstack/react-query"
import { useChat } from "@ai-sdk/react"

type Todo = {
  id: number;
  title: string;
  completed: boolean;
}

// localhost:8080/todosにアクセスしてtodoリストを取得
const getTodos = async() => {
  const res = await fetch("http://localhost:8080/todos")
  return res.json()
}

export default function Home() {
  const query = useQuery({
    queryKey: ["todos"],
    queryFn: getTodos,
  }) as { data: Todo[] | undefined };

  const {messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    experimental_throttle: 1000,
  });

  return (
    <div>
      {query.data?.map((todo) => (
        <div key={todo.id} style={{display:"flex", alignItems: "center" , gap: 8}}>
          <input type="checkbox" checked={todo.completed} readOnly />
          <span>{todo.title}</span>
          <span style={{color: "#888", fontSize: 12}}>{todo.id}</span>
        </div>
      ))}
      <div>
        {/* formが送信されたら、入力されたチャットの内容が/api/chatに投げられる。 */}
        <form onSubmit= {handleSubmit}>
          <input value={input} onChange={handleInputChange} />
          <button type="submit">Send</button>
        </form>
        <div>
          {messages.map((message) => (
            <div key={message.id}>{message.content}</div>
          ))}
        </div>
      </div>
    </div>
  )
    
}
