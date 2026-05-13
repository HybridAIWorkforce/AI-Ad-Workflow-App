"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatbotWidget({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Ad Workflow assistant. I can help you understand the 5-step process, provide tips for better results, or answer any questions about creating ads. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView?.({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input?.trim?.() || loading) return;

    const userMessage = input?.trim?.() ?? "";
    setInput("");
    setMessages((prev) => [...(prev ?? []), { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...(messages?.map((m) => ({ role: m?.role, content: m?.content })) ?? []),
            { role: "user", content: userMessage }
          ]
        })
      });

      if (!response?.ok) throw new Error("Failed to get response");

      const reader = response?.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let partialRead = "";

      setMessages((prev) => [...(prev ?? []), { role: "assistant", content: "" }]);

      while (true) {
        const result = await reader?.read();
        if (result?.done) break;

        const chunk = decoder?.decode(result?.value, { stream: true }) ?? "";
        partialRead += chunk;

        const lines = partialRead?.split?.("\n") ?? [];
        partialRead = lines?.pop?.() ?? "";

        for (const line of lines ?? []) {
          if (line?.startsWith?.("data: ")) {
            const data = line?.slice?.(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed?.content ?? "";
              if (content) {
                assistantMessage += content;
                setMessages((prev) => {
                  const newMessages = [...(prev ?? [])];
                  if ((newMessages?.length ?? 0) > 0) {
                    newMessages[(newMessages?.length ?? 1) - 1] = {
                      role: "assistant",
                      content: assistantMessage
                    };
                  }
                  return newMessages;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...(prev ?? []),
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">AI Assistant</div>
                <div className="text-xs text-gray-400">Ask me anything</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages?.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message?.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message?.role === "user" ? "bg-purple-600" : "bg-gray-700"
                  }`}
                >
                  {message?.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    message?.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  {message?.content ?? ""}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="bg-gray-800 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-800">
            <form
              onSubmit={(e) => {
                e?.preventDefault?.();
                handleSend?.();
              }}
              className="flex gap-2"
            >
              <Input
                value={input ?? ""}
                onChange={(e) => setInput(e?.target?.value ?? "")}
                placeholder="Ask a question..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={loading || !input?.trim?.()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
