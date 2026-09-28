import { FlowVariableInput } from "../../Flow/FlowVariableInput";
import { useSettingsStore } from "../../../store";
import { useTranslation } from "../../../utils/i18n";

interface BearerTokenInputProps {
  token: string;
  prefix: string;
  onTokenChange: (token: string) => void;
  onPrefixChange: (prefix: string) => void;
  envVariablesMap?: Record<string, string>;
}

const BEARER_PREFIX_OPTIONS = [
  { value: "Bearer", labelKey: "auth.bearer" as const },
  { value: "JWT", labelKey: "auth.jwt" as const },
  { value: "BearerJWT", labelKey: "auth.bearerJWT" as const },
  { value: "Token", labelKey: "auth.token" as const },
  { value: "Custom", labelKey: "auth.custom" as const },
];

export function BearerTokenInput({
  token,
  prefix,
  onTokenChange,
  onPrefixChange,
  envVariablesMap = {},
}: BearerTokenInputProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const isCustomPrefix = !BEARER_PREFIX_OPTIONS.some((p) => p.value === prefix);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={isCustomPrefix ? "Custom" : prefix || "Bearer"}
          onChange={(e) => onPrefixChange(e.target.value)}
          className="px-2 py-1 rounded text-xs"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
        >
          {BEARER_PREFIX_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.value === "JWT" || p.value === "BearerJWT" || p.value === "Token" ? p.value : t(p.labelKey)}
            </option>
          ))}
        </select>
        {isCustomPrefix && prefix && (
          <input
            type="text"
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            placeholder={t('auth.customPrefix')}
            className="w-24 px-2 py-1 rounded text-xs"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
          />
        )}
      </div>
      <FlowVariableInput
        value={token || ""}
        onChange={onTokenChange}
        placeholder={t('auth.token')}
        currentEnv={envVariablesMap}
      />
    </div>
  );
}