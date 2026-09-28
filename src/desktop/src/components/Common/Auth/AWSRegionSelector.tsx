import { AWS_REGIONS, DEFAULT_AWS_REGION } from "./constants";

interface AWSRegionSelectorProps {
  value: string;
  onChange: (region: string) => void;
  className?: string;
}

export function AWSRegionSelector({ value, onChange, className = "" }: AWSRegionSelectorProps) {
  return (
    <select
      value={value || DEFAULT_AWS_REGION}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2 py-1 rounded text-xs ${className}`}
      style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
    >
      {AWS_REGIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}