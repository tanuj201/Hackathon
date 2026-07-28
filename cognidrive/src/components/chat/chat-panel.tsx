"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSwitcher } from "./model-switcher";
import { Send, Loader2, User, Bot, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AIModel, ChatMessage, StoredFile } from "@/types";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  selectedFile: StoredFile | null;
  model: AIModel;
  onModelChange: (model: AIModel) => void;
}

interface ConfigStatus {
  supabase: boolean;
  supabaseServiceKey: boolean;
  openrouter: boolean;
  siteUrl: string;
}

export function ChatPanel({ selectedFile, model, onModelChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages([]);
  }, [selectedFile?.id]);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then(setConfigStatus)
      .catch(() => {});
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          fileId: selectedFile?.id,
          model,
          history,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to get response";
      toast({
        title: "Chat error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div>
          <h2 className="font-semibold">Multi-AI Chat</h2>
          <p className="text-xs text-muted-foreground">
            {selectedFile
              ? `RAG enabled · ${selectedFile.name}`
              : "Select a document for context-aware chat"}
          </p>
        </div>
        <ModelSwitcher model={model} onModelChange={onModelChange} />
      </div>

      {configStatus && !configStatus.openrouter && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm shrink-0">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-700">OpenRouter API key not configured</p>
            <p className="text-yellow-600/80 text-xs mt-1">
              Set <code className="font-mono">OPENROUTER_API_KEY</code> in{" "}
              <code className="font-mono">.env.local</code> and restart the dev server.
              Get a free key at{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ask questions about your documents</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-2.5">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedFile
                ? "Ask about this document..."
                : "Type a message..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
