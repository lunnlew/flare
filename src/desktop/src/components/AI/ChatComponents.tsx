import { CHAT_COMMANDS, QUICK_COMMANDS } from "../../constants/chat";
import type { Message } from "../../types/chat";
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";
export type { Message } from "../../types/chat";

interface ChatMessageProps {
  msg: Message;
}

export function ChatMessage({ msg }: ChatMessageProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div
      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className="max-w-lg px-4 py-3 rounded-lg"
        style={{
          backgroundColor: msg.role === "user" ? 'var(--accent)' : 'var(--bg-secondary)',
          color: msg.role === "user" ? 'var(--text-inverse)' : 'var(--text-primary)',
          border: msg.role === "user" ? 'none' : '1px solid var(--border-color)',
        }}
      >
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {msg.action && (
          <div className="mt-2 pt-2 text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            {msg.action.type === "api_call" && t('chat.apiCall')}
            {msg.action.type === "search" && t('chat.search')}
            {msg.action.type === "list" && t('chat.listApis')}
            {msg.action.type === "agent" && t('chat.agent')}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatInputProps {
  input: string;
  onInputChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onClear: () => void;
  isLoading: boolean;
  hasMessages: boolean;
}

export function ChatInput({
  input,
  onInputChange,
  onKeyDown,
  onSend,
  onClear,
  isLoading,
  hasMessages
}: ChatInputProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('chat.placeholder')}
          className="flex-1 px-4 py-2 rounded-lg text-sm focus:outline-none"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          {t('chat.send')}
        </button>
        {hasMessages && (
          <button
            onClick={onClear}
            className="px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            title={t('chat.clearConversation')}
          >
            {t('chat.clear')}
          </button>
        )}
      </div>
      <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('chat.pressEnter')}
      </div>
    </div>
  );
}

interface QuickCommandsProps {
  onInputChange: (v: string) => void;
  onToggleHelp: () => void;
}

export function QuickCommands({ onInputChange, onToggleHelp }: QuickCommandsProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
      <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{t('chat.quick')}:</span>
      {QUICK_COMMANDS.map((cmd) => (
        <button
          key={cmd.cmd}
          onClick={() => onInputChange(cmd.cmd + " ")}
          className="px-2 py-1 rounded text-xs whitespace-nowrap transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {cmd.cmd}
        </button>
      ))}
      <button
        onClick={onToggleHelp}
        className="px-2 py-1 rounded text-xs whitespace-nowrap transition-colors"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        ?
      </button>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--accent)' }}>{t('chat.agent')}</span>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} title={t('chat.connected')} />
      </div>
    </div>
  );
}

interface HelpPanelProps {
  onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('chat.howToUse')}</h3>
      <div className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
        <p><strong>{t('chat.agentPowered')}</strong></p>
        <p className="ml-4">
          {t('chat.aiChatPoweredByClaude')}
        </p>
        <p className="mt-3"><strong>{t('chat.quickCommands')}</strong></p>
        <ul className="list-disc list-inside ml-4">
          {CHAT_COMMANDS.map((cmd) => (
            <li key={cmd.cmd}><code style={{ color: 'var(--accent)' }}>{cmd.cmd}</code> - {t(cmd.descKey)}</li>
          ))}
        </ul>
      </div>
      <button
        onClick={onClose}
        className="mt-3 px-3 py-1 rounded text-xs transition-colors"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        {t('chat.close')}
      </button>
    </div>
  );
}