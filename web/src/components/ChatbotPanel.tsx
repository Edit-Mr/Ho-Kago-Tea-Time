import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { sendChat, type ChatMessage } from "../lib/api";
import { useUiStore } from "../store/uiStore";
import { Bot, Send, X } from "lucide-react";

type Message = ChatMessage;

function ChatbotPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "您好，我可以幫你檢查附近是否安全或總結某個行政區的狀況。" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const toggleChatbot = useUiStore((s) => s.toggleChatbot);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    const reply = await sendChat(newMessages);
    setMessages([...newMessages, reply]);
    setLoading(false);
  };

  return (
    <Card className="w-[360px] shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur pointer-events-auto">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4" aria-hidden /> Chatbot
        </CardTitle>
        <Button variant="ghost" onClick={toggleChatbot} aria-label="Close chatbot">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-64 overflow-y-auto rounded-lg border border-slate-800 p-3 bg-slate-800/40 space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={msg.role === "assistant" ? "text-slate-200" : "text-brand-200 text-right"}
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">{msg.role}</p>
              <p className="text-sm leading-snug">{msg.content}</p>
            </div>
          ))}
          {loading && <p className="text-xs text-slate-400">Thinking...</p>}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="問：附近安全嗎？"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} disabled={loading} aria-label="Send message">
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChatbotPanel;
