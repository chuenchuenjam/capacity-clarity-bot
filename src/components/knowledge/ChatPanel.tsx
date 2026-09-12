import { useState } from "react";
import { useChat } from "ai/react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Copy, FileSearch, Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { generateDeck } from "@/lib/deck";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const suggestions = [
  "What's the status of Data Intake?",
  "Which docs are still drafts?",
  "Summarise the Agentic Bot project for leadership",
];

export function ChatPanel({ onNavigated }: { onNavigated?: () => void }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });
  const [deckBusy, setDeckBusy] = useState(false);

  const buildDeck = async (answer: string) => {
    const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!session?.access_token || !question) return;
    setDeckBusy(true);
    try {
      const deckId = await generateDeck(session.access_token, question, answer);
      onNavigated?.();
      void navigate({ to: "/deck/$deckId", params: { deckId } });
    } catch (error: any) {
      toast.error(error?.message || "Could not build the deck");
    } finally {
      setDeckBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-background">
      <Conversation className="min-h-0">
        <ConversationContent className="gap-6 px-5 py-6 sm:px-6">
          {messages.length === 0 && (
            <ConversationEmptyState className="min-h-[60vh] justify-center p-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot className="h-6 w-6" /></span>
              <div className="mt-2 space-y-1"><h3 className="font-display text-xl font-semibold">What do you need to know?</h3><p className="max-w-sm text-sm text-muted-foreground">Ask across project pages and turn the answer into a presentation.</p></div>
              <div className="mt-5 grid w-full gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  onClick={() => setInput(s)}
                  className="h-auto justify-start whitespace-normal rounded-xl px-4 py-3 text-left text-xs font-medium"
                >
                  <FileSearch className="mr-2 h-4 w-4 shrink-0 text-primary" />
                  {s}
                </Button>
              ))}
              </div>
            </ConversationEmptyState>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>{m.role === "assistant" ? <MessageResponse>{m.content}</MessageResponse> : m.content}</MessageContent>
              {m.role === "assistant" && !isLoading && (
                <MessageActions>
                  <MessageAction tooltip="Copy answer" label="Copy answer"
                    onClick={() => {
                      void navigator.clipboard.writeText(m.content);
                      toast.success("Copied");
                    }}><Copy className="h-3.5 w-3.5" /></MessageAction>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs"
                    disabled={deckBusy}
                    onClick={() => void buildDeck(m.content)}
                  >
                    {deckBusy ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Presentation className="mr-1 h-3 w-3" />
                    )}
                    Generate deck
                  </Button>
                </MessageActions>
              )}
            </Message>
          ))}
          {isLoading && (
            <Message from="assistant"><MessageContent><Shimmer className="text-sm">Searching team knowledge...</Shimmer></MessageContent></Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t bg-card/80 p-4 backdrop-blur-xl sm:p-5">
      <PromptInput onSubmit={(_message, event) => handleSubmit(event)} className="rounded-xl border-primary/15 bg-background shadow-soft">
        <PromptInputTextarea
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about projects, status, or resources..."
          className="min-h-20 px-4 text-sm"
        />
        <PromptInputFooter className="justify-end"><PromptInputSubmit status={isLoading ? "streaming" : "ready"} disabled={!input.trim()} /></PromptInputFooter>
      </PromptInput>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Answers include only knowledge you have permission to access.</p>
      </div>
    </div>
  );
}
