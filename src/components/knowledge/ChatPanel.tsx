import { useEffect, useRef } from "react";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const suggestions = [
  "What's the status of Data Intake?",
  "Which docs are still drafts?",
  "Find the PPT template for competitive intro",
];

export function ChatPanel() {
  const { session } = useAuth();
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-2 px-1">
              <p className="text-sm text-muted-foreground">Try asking:</p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleInputChange({ target: { value: s } } as any)}
                  className="block w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-xs text-foreground hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[90%] items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2 border-t border-border pt-3">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about projects, docs, or status..."
          className="h-9 flex-1 text-sm"
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
