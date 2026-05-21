import { useState, useRef, useEffect, useCallback } from "react";
import { ChatCircleDots, PaperPlaneTilt, X, Robot, UserCircle, ArrowDown } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cdnUrl } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 1000;
export const CHATBOT_PREFILL_EVENT = "fscape:chatbot-prefill";

/**
 * Lightweight markdown → HTML for chatbot messages.
 * Handles: bold, italic, lists, line breaks. Escapes HTML to prevent XSS.
 */
function simpleMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  const lines = html.split("\n");
  const result = [];
  let inList = false;
  let listType = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);

    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ul>");
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ol>");
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      if (trimmed === "") {
        result.push("<br/>");
      } else {
        result.push(`<p>${trimmed}</p>`);
      }
    }
  }

  if (inList) result.push(`</${listType}>`);
  return result.join("");
}

const WELCOME_MESSAGE = {
  role: "bot",
  text: "Xin chào! Mình là trợ lý AI của FScape. Bạn có thể hỏi mình về phòng trọ, giá thuê, tòa nhà, hợp đồng hay bất kỳ thông tin nào về hệ thống nhé!",
  timestamp: new Date().toISOString(),
};

export default function ChatbotWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 96);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 96 ? "auto" : "hidden";
  }, [input, isOpen]);

  useEffect(() => {
    const handlePrefill = (event) => {
      const prompt = String(event?.detail?.prompt ?? "").trim();
      if (!prompt) return;
      setIsOpen(true);
      setInput(prompt);
    };

    window.addEventListener(CHATBOT_PREFILL_EVENT, handlePrefill);
    return () => window.removeEventListener(CHATBOT_PREFILL_EVENT, handlePrefill);
  }, []);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!isNearBottom);
  };

  const buildHistory = () =>
    messages
      .filter((m) => m !== WELCOME_MESSAGE)
      .map((m) => ({
        role: m.role === "bot" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    const userMsg = { role: "user", text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = buildHistory();
      const { reply, timestamp } = await api.post("/api/chatbot/chat", {
        message: text,
        history,
      });
      setMessages((prev) => [...prev, { role: "bot", text: reply, timestamp }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Xin lỗi, mình không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau nhé!",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating trigger button — bottom right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fscape-chatbot-widget fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-olive text-primary shadow-lg hover:bg-olive/90 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer animate-[fadeIn_0.3s_ease-out]"
          aria-label="Mở chatbot"
        >
          <ChatCircleDots size={28} weight="fill" />
        </button>
      )}

      {/* Chat panel — bottom right */}
      {isOpen && (
        <div className="fscape-chatbot-widget fixed bottom-6 right-6 z-50 flex flex-col w-[360px] h-[520px] max-h-[80vh] rounded-2xl bg-white shadow-2xl border border-muted/20 overflow-hidden sm:w-[400px] animate-[slideUp_0.25s_ease-out]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white shrink-0">
            <div className="flex size-9 items-center justify-center rounded-full bg-olive/20">
              <Robot size={20} weight="fill" className="text-olive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">FScape AI</p>
              <p className="text-xs text-white/60">Trợ lý thông minh</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng chatbot"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50"
          >
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} user={user} />
            ))}

            {isLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll-to-bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 flex size-8 items-center justify-center rounded-full bg-primary/80 text-white shadow-md hover:bg-primary transition-colors cursor-pointer"
            >
              <ArrowDown size={16} />
            </button>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-muted/15 bg-white px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                className="flex-1 resize-none rounded-xl border border-muted/25 bg-gray-50 px-3 py-2 text-sm text-primary outline-none placeholder:text-muted/50 focus:border-olive/50 focus:ring-1 focus:ring-olive/20 transition-colors max-h-24"
                style={{ height: "40px", overflowY: "hidden" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-olive text-primary transition-all hover:bg-olive/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Gửi tin nhắn"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            </div>
            {input.length > MAX_MESSAGE_LENGTH * 0.9 && (
              <p className="mt-1 text-xs text-right text-muted/60">
                {input.length}/{MAX_MESSAGE_LENGTH}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ChatMessage({ message, user }) {
  const isBot = message.role === "bot";

  return (
    <div className={`flex gap-2.5 ${isBot ? "justify-start" : "justify-end"}`}>
      {isBot && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-olive/15 mt-0.5">
          <Robot size={20} weight="fill" className="text-olive" />
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isBot
            ? `bg-white border border-muted/15 text-primary shadow-sm ${message.isError ? "border-red-200 bg-red-50/50" : ""}`
            : "bg-primary text-white"
        }`}
      >
        {isBot ? (
          <div
            className="[&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:mb-1.5 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-1.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-0.5 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(message.text) }}
          />
        ) : (
          <p className="whitespace-pre-wrap">{message.text}</p>
        )}
      </div>

      {!isBot && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary/10 mt-0.5">
          {user?.avatar_url ? (
            <img src={cdnUrl(user.avatar_url)} alt="" className="size-full object-cover" />
          ) : (
            <UserCircle size={20} weight="fill" className="text-primary" />
          )}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-olive/15 mt-0.5">
        <Robot size={20} weight="fill" className="text-olive" />
      </div>
      <div className="rounded-2xl bg-white border border-muted/15 px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-muted/40 animate-bounce [animation-delay:0ms]" />
          <span className="size-2 rounded-full bg-muted/40 animate-bounce [animation-delay:150ms]" />
          <span className="size-2 rounded-full bg-muted/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
