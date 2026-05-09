import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
}

export default function AIGuide() {
  const { projectId, step } = useParams<{
    projectId: string;
    step: string;
  }>();
  const projectIdNum = Number(projectId) || 0;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const guideQuery = trpc.ai.guide.useQuery(
    {
      currentStep: step || "setup",
      eventType: `${step || "setup"}_load`,
      context: { projectId: projectIdNum },
    },
    { enabled: !!step && projectIdNum > 0 }
  );

  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    if (guideQuery.data?.message && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "ai",
          content: guideQuery.data.message,
        },
      ]);
    }
  }, [guideQuery.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await chatMutation.mutateAsync({
        history: newMessages.map(m => ({ role: m.role, content: m.content })),
        currentStep: step || "setup",
        context: { projectId: projectIdNum },
      });

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: response.message,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "ai",
          content: "Sorry, I ran into an error connecting to the AI provider.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    "Is my script too long?",
    "Zoom target tips?",
    "Best voice for this?",
  ];

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between p-4 border-b border-border bg-card lg:hidden"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="font-syne font-semibold text-sm">AI Guide</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">Online</span>
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          isCollapsed ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-border hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/10 border border-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-syne font-semibold text-sm">AI Guide</span>
              <span className="block font-mono text-[10px] text-muted-foreground">
                Proactive assistant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">Online</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-6 h-6 flex-shrink-0 flex items-center justify-center border ${
                    msg.role === "ai"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted border-border"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <Sparkles className="w-3 h-3 text-primary" />
                  ) : (
                    <User className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] p-3 text-sm font-dm leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-card border border-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              <div className="w-6 h-6 flex-shrink-0 bg-primary/10 border border-primary flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-card border border-border p-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
              Quick questions
            </p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="px-2 py-1 text-xs font-dm border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask anything..."
              className="flex-1 px-3 py-2 bg-background border-2 border-border text-sm font-dm focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
