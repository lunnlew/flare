/**
 * useMockPreview - Hook for generating mock preview values via backend API
 *
 * Uses the unified backend generation engine to ensure consistency
 * between frontend preview and Mock Server behavior.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { generateMockValue } from "../../services/api";
import { toast } from "../../store/notificationStore";
import { t } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export interface PreviewItem {
  label: string;
  value: string;
  enabled: boolean;
}

interface UseMockPreviewOptions {
  enabledRules: string[];
  sequencePrefix?: string;
  sequenceStart?: number;
  sequencePadding?: number;
  refreshInterval?: number; // ms, 0 = no auto-refresh
  locale?: string; // Mock locale for i18n data pools
}

export function useMockPreview(options: UseMockPreviewOptions) {
  const {
    enabledRules,
    sequencePrefix = "",
    sequenceStart = 1,
    sequencePadding = 3,
    refreshInterval = 0,
    locale = 'en-US',
  } = options;

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const prevEnabledRulesRef = useRef<string[]>([]);
  const generatePreviewsRef = useRef<() => Promise<void>>();

  const generatePreviews = useCallback(async () => {
    setLoading(true);
    try {
      const ruleTypes = ["email", "name", "phone", "city", "uuid", "sequence"];
      const items: PreviewItem[] = await Promise.all(
        ruleTypes.map(async (type) => {
          const value = await generateMockValue(type, locale);
          return {
            label: type,
            value: type === "sequence"
              ? `${sequencePrefix || "field"}_${String(sequenceStart).padStart(sequencePadding, "0")}`
              : value,
            enabled: enabledRules.includes(type),
          };
        })
      );
      setPreviewItems(items);
    } catch (error) {
      toast.error(t('common.error.mockPreviewFailed', useSettingsStore.getState().language));
    } finally {
      setLoading(false);
    }
  }, [enabledRules, sequencePrefix, sequenceStart, sequencePadding, locale]);

  // Keep ref updated with latest callback to avoid interval recreation
  generatePreviewsRef.current = generatePreviews;

  // Use deep comparison for enabledRules array to avoid unnecessary re-fetching
  useEffect(() => {
    const enabledRulesStr = JSON.stringify(enabledRules);
    const prevEnabledRulesStr = JSON.stringify(prevEnabledRulesRef.current);

    if (enabledRulesStr !== prevEnabledRulesStr) {
      prevEnabledRulesRef.current = enabledRules;
      generatePreviews();
    }
  }, [generatePreviews, enabledRules]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => generatePreviewsRef.current?.(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return { previewItems, loading, refresh: generatePreviews };
}