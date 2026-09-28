import { useEnvironmentStore } from "../../store";

interface EnvironmentBarProps {
  onOpenEnvManager?: () => void;
}

export function EnvironmentBar({ onOpenEnvManager }: EnvironmentBarProps) {
  const environments = useEnvironmentStore((s) => s.environments);
  const selectedEnv = useEnvironmentStore((s) => s.selectedEnv);
  const setSelectedEnv = useEnvironmentStore((s) => s.setSelectedEnv);

  return (
    <div
      className="px-4 py-2 flex items-center gap-2"
      style={{
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Environment:
      </span>
      {environments.map((env) => (
        <button
          key={env.name}
          onClick={() => setSelectedEnv(env.name)}
          className="px-2 py-0.5 text-xs rounded"
          style={
            selectedEnv === env.name
              ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }
              : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
          }
        >
          {env.name}
        </button>
      ))}
      {onOpenEnvManager && (
        <button
          onClick={onOpenEnvManager}
          className="ml-auto p-1 rounded"
          style={{ color: 'var(--text-muted)' }}
          title="Environment management"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}