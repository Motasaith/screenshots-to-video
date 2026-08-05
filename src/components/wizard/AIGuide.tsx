import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useWizardStore } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  ChevronRight,
} from "lucide-react";

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
}

export default function AIGuide({ onCollapse }: { onCollapse?: () => void }) {
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

  const { stepData } = useWizardStore();
  const currentStepData = stepData[step as keyof typeof stepData] || {};

  // Fetch project data for context
  const { data: project } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const fullContext = {
    projectId: projectIdNum,
    projectData: project ? { title: project.title, description: project.description, platform: project.platform, aspectRatio: project.aspectRatio } : {},
    currentStepData,
  };

  const guideQuery = trpc.ai.guide.useQuery(
    {
      currentStep: step || "preview",
      eventType: `${step || "preview"}_load`,
      context: fullContext,
    },
    { enabled: !!step && projectIdNum > 0 }
  );

  const chatMutation = trpc.ai.chat.useMutation();
  const proactiveMutation = trpc.ai.proactiveFeedback.useMutation();

  // Debounced proactive feedback
  useEffect(() => {
    if (!step) return;

    const timeout = setTimeout(async () => {
      try {
        const response = await proactiveMutation.mutateAsync({
          currentStep: step,
          context: fullContext,
        });

        if (response.message) {
          setMessages((prev) => {
            // Avoid duplicate messages
            if (prev.length > 0 && prev[prev.length - 1].content === response.message) {
              return prev;
            }
            return [
              ...prev,
              {
                id: `ai-proactive-${Date.now()}`,
                role: "ai",
                content: response.message,
              },
            ];
          });
        }
      } catch {
        // Ignore proactive errors silently
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [
    project?.title,
    project?.description,
    (currentStepData as { description?: string })?.description,
    (currentStepData as { narration?: string })?.narration,
    step
  ]);

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
        context: fullContext,
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
        className="flex items-center justify-between p-4 border-b-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] lg:hidden"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--sketch-fg)]" />
          <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">AI Guide</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">Online</span>
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-[var(--sketch-fg)]" />
        ) : (
          <ChevronUp className="w-4 h-4 text-[var(--sketch-fg)]" />
        )}
      </button>

      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          isCollapsed ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b-2 border-[var(--sketch-fg-subtle)] hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand/10 border-2 border-brand flex items-center justify-center sketch-border-sm">
              <Bot className="w-4 h-4 text-[var(--sketch-fg)]" />
            </div>
            <div>
              <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">AI Guide</span>
              <span className="block font-mono text-[10px] text-[var(--sketch-fg-subtle)]">
                Proactive assistant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">Online</span>
            </div>
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="p-1 rounded-lg hover:bg-[var(--sketch-fg-subtle)]/25 text-[var(--sketch-fg)] transition-colors ml-1"
                title="Minimize AI Guide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
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
                  className={`w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 ${
                    msg.role === "ai"
                      ? "bg-brand/10 border-brand"
                      : "bg-[var(--sketch-card-bg)] border-[var(--sketch-fg-subtle)]"
                  }`}
                  style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
                >
                  {msg.role === "ai" ? (
                    <Bot className="w-3 h-3 text-[var(--sketch-fg)]" />
                  ) : (
                    <User className="w-3 h-3 text-[var(--sketch-fg-subtle)]" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] p-3 text-sm font-body leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-fg-subtle)] sketch-border-sm"
                      : "bg-[var(--sketch-fg)] text-[var(--sketch-bg)]"
                  }`}
                  style={msg.role === "user" ? { borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" } : {}}
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
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 bg-brand/10 border-brand" style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}>
                <Bot className="w-3 h-3 text-[var(--sketch-fg)]" />
              </div>
              <div className="p-3 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-fg-subtle)] sketch-border-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[var(--sketch-fg-subtle)] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[var(--sketch-fg-subtle)] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-[var(--sketch-fg-subtle)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] mb-2 uppercase tracking-wider">
              Quick questions
            </p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="px-2 py-1 text-sm font-hand text-[var(--sketch-fg-muted)] border border-dashed border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-fg-muted)] hover:bg-brand/10 transition-colors"
                  style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 border-t-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask anything..."
              className="flex-1 px-3 py-2 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] text-sm font-body focus:outline-none focus:border-brand transition-colors sketch-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 bg-[var(--sketch-fg)] text-[var(--sketch-bg)] flex items-center justify-center hover:bg-[var(--sketch-fg)]/80 transition-colors disabled:opacity-50 sketch-border-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
