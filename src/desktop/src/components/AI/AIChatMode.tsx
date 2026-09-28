import { useCallback, useRef, useEffect } from "react";
import { ChatMessage, ChatInput, QuickCommands, HelpPanel } from "./ChatComponents";
import type { Message } from "./ChatComponents";
import { useChatStore } from "../../store";
import { getErrorMessage } from "../../utils/string";
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export type { Message };

interface AIChatModeProps {
  selectedApi?: string;
  selectedEndpoint?: string;
}

export function AIChatMode({ selectedApi, selectedEndpoint }: AIChatModeProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const showHelp = useChatStore((s) => s.showHelp);
  const chatInput = useChatStore((s) => s.chatInput);
  const addMessage = useChatStore((s) => s.addMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setLoading = useChatStore((s) => s.setLoading);
  const setShowHelp = useChatStore((s) => s.setShowHelp);
  const setChatInput = useChatStore((s) => s.setChatInput);
  const sendToAgent = useChatStore((s) => s.sendToAgent);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!chatInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setChatInput("");
    setLoading(true);

    try {
      // Route through store action (agent or direct command)
      const response = await sendToAgent(chatInput, selectedApi, selectedEndpoint);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };

      addMessage(assistantMessage);
    } catch (e: unknown) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `${t('common.error')}: ${getErrorMessage(e)}`,
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [chatInput, selectedApi, selectedEndpoint, addMessage, setLoading, setChatInput, sendToAgent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Quick Commands Bar */}
      <QuickCommands
        onInputChange={setChatInput}
        onToggleHelp={() => setShowHelp(!showHelp)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showHelp && (
          <HelpPanel onClose={() => setShowHelp(false)} />
        )}

        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl mb-2" style={{ color: 'var(--text-muted)' }}>{t('chat.agent')}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('chat.askMeAnything')}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {t('chat.tryListOrSearch')}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <div style={{ color: 'var(--accent)' }}>{t('chat.agent')}</div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('chat.thinking')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        input={chatInput}
        onInputChange={setChatInput}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        onClear={clearMessages}
        isLoading={isLoading}
        hasMessages={messages.length > 0}
      />
    </div>
  );
}