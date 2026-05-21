import { useChat } from "@ai-sdk/react";
import React from "react";

export function AssistantChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    headers: {
      "X-Context": "user-actions",
    },
  });

  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <span className="font-semibold">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me to control your home..."
          className="flex-1 border rounded-md px-3 py-2"
        />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
          Send
        </button>
      </form>
    </div>
  );
}
