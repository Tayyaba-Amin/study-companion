import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Markdown } from "../ui/Markdown";
import { supabase } from "../../lib/supabase";
import { invokeEdgeFunction } from "../../lib/api";
import type { Document, ChatMessage as ChatMsg } from "../../types";

interface ChatTabProps {
  doc: Document;
}

export function ChatTab({ doc }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("document_id", doc.id)
      .order("created_at", { ascending: true });
    setMessages((data as ChatMsg[]) ?? []);
    setLoading(false);
  }, [doc.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    // Optimistically add user message
    const tempUser: ChatMsg = {
      id: `temp-${Date.now()}`,
      document_id: doc.id,
      user_id: doc.user_id,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const result = await invokeEdgeFunction<{
        message: ChatMsg;
        history: ChatMsg[];
      }>("chat", {
        document_id: doc.id,
        message: text,
      });

      // Replace optimistically added user message (edge function saved it) + use the full history from server
      setMessages(result.history);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't get a response from the AI.",
      );
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/50">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading conversation…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {messages.length === 0 ? (
        // Empty state
        <Card padding="lg" className="flex-1 flex flex-col justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Ask anything about this document
            </h3>
            <p className="mt-2 text-foreground/70 text-sm max-w-md mx-auto">
              Stuck on a concept? Need clarification? Ask questions and get
              answers drawn directly from your notes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {[
                "Summarise the key concepts",
                "Explain this topic simply",
                "What are the main takeaways?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-muted text-foreground/70 hover:bg-border hover:text-foreground transition-colors duration-150 cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        // Message list
        <div className="flex-1 overflow-auto space-y-4 pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
              >
                {m.role === "assistant" ? (
                  <Markdown text={m.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted text-foreground text-sm">
                <span className="flex items-center gap-1.5 text-foreground/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking…
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <p className="text-sm text-destructive bg-destructive/5 px-4 py-2 rounded-xl" role="alert">
                {error}
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 pt-4 border-t border-border mt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this document…"
          rows={1}
          className="flex-1 px-4 py-2.5 border border-border rounded-xl text-base bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors duration-200 resize-none"
          disabled={sending}
        />
        <Button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || sending}
          className="shrink-0"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}