import { AuthType } from "../../../constants/http";
import { useSettingsStore } from "../../../store";
import { useTranslation } from "../../../utils/i18n";

interface AuthTypeSelectorProps {
  value: AuthType;
  onChange: (type: AuthType) => void;
}

const AUTH_TYPE_KEYS = {
  none: 'auth.none' as const,
  bearer: 'auth.bearer' as const,
  basic: 'auth.basic' as const,
  apiKey: 'auth.apiKey' as const,
  oauth2: 'auth.oauth2' as const,
  aws: 'auth.aws' as const,
};

export function AuthTypeSelector({ value, onChange }: AuthTypeSelectorProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="flex gap-2 flex-wrap">
      {(Object.keys(AUTH_TYPE_KEYS) as AuthType[]).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className="px-2 py-1 text-xs rounded"
          style={
            value === type
              ? { backgroundColor: "var(--accent-muted)", color: "var(--accent)" }
              : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }
          }
        >
          {t(AUTH_TYPE_KEYS[type])}
        </button>
      ))}
    </div>
  );
}