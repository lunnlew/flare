import { Spinner } from "../../Common/Spinner";
import { useSettingsStore } from "../../../store";
import { useTranslation } from "../../../utils/i18n";
import { OAuthStatus } from "../../../hooks/Flow/useOAuthFlow";

interface OAuthStatusDisplayProps {
  status: OAuthStatus;
  error: string | null;
  codeInput: string;
  tokenType?: string;
  accessToken?: string;
  refreshToken?: string;
  onCodeInputChange: (code: string) => void;
  onExchangeCode: () => void;
  onRefresh: () => void;
  onClear: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export function OAuthStatusDisplay({
  status,
  error,
  codeInput,
  tokenType = "Bearer",
  accessToken = "",
  refreshToken,
  onCodeInputChange,
  onExchangeCode,
  onRefresh,
  onClear,
  onRetry,
  onCancel,
}: OAuthStatusDisplayProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (status === "authorized" && accessToken) {
    return (
      <div className="p-3 rounded" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--success)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--success)" }}>{t('auth.authorized')}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {tokenType} · {accessToken.length} {t('auth.characters')}
          </span>
        </div>
        {refreshToken && (
          <div className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>{t('auth.refreshTokenAvailable')}</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
            {t('auth.refresh')}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(accessToken)}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
          >
            {t('auth.copy')}
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
          >
            {t('auth.clear')}
          </button>
        </div>
      </div>
    );
  }

  if (status === "authorizing") {
    return (
      <div className="p-3 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid var(--accent)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Spinner size="md" borderColor="var(--accent)" />
          <span className="text-xs" style={{ color: "var(--accent)" }}>{t('auth.authorizing')}</span>
        </div>
        <div className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>{t('auth.completeAuthInBrowser')}</div>
        <div className="mb-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => onCodeInputChange(e.target.value)}
            placeholder={t('auth.pasteAuthCode')}
            className="w-full px-2 py-1 rounded text-xs"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExchangeCode}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
          >
            {t('auth.exchangeToken')}
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
          >
            {t('auth.cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="p-3 rounded" style={{ backgroundColor: "rgba(248, 113, 113, 0.1)", border: "1px solid var(--danger)" }}>
        <div className="text-xs mb-2" style={{ color: "var(--danger)" }}>{error}</div>
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
          >
            {t('auth.retry')}
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
          >
            {t('auth.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}