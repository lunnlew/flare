import { CapturedRequest } from './types';

// Default patterns (used when no config is set)
const DEFAULT_EXCLUDE_PATTERNS = [
  /\.js(\?.*)?$/,
  /\.css(\?.*)?$/,
  /\.png(\?.*)?$/,
  /\.jpg(\?.*)?$/,
  /\.jpeg(\?.*)?$/,
  /\.gif(\?.*)?$/,
  /\.svg(\?.*)?$/,
  /\.ico(\?.*)?$/,
  /\.woff2?(\?.*)?$/,
  /\.ttf(\?.*)?$/,
  /\.eot(\?.*)?$/,
  /\.map(\?.*)?$/,
  /\.webp(\?.*)?$/,
  /\.avif(\?.*)?$/,
  /\/static\//,
  /\/assets\//,
  /\/dist\//,
  /\/build\//,
  /\/sockjs-node\//,
  /\/info\?t=/,
  /chrome-extension\//,
  /chrome:\/\//,
];

// Cached config from storage
let cachedConfig: {
  enabled: boolean;
  allowedDomains: string[];
  excludePatterns: string[];
} | null = null;

// Cache for compiled regex patterns - rebuilt only when config changes
let compiledPatternsCache: { patterns: RegExp[]; configVersion: number } | null = null;
let configVersion = 0;

// Check for potentially catastrophic regex patterns (ReDoS prevention)
// Uses simple string contains checks to avoid regex quantifier issues
function isUnsafeRegex(pattern: string): boolean {
  // Check for nested quantifiers like (a+)+ or (a*)* - common ReDoS patterns
  // Simple string search instead of regex to avoid quantifier issues
  if (pattern.includes('(+') || pattern.includes('*)') ||
      pattern.includes(')+') || pattern.includes(')*')) {
    const nestedQuantifier = pattern.includes('(+') && pattern.includes(')+');
    const nestedStar = pattern.includes('*)') && pattern.includes(')*');
    if (nestedQuantifier || nestedStar) return true;
  }
  // Check for lookahead/lookbehind with quantifiers
  if ((pattern.includes('(?=') || pattern.includes('(?!') || pattern.includes('(?<=') || pattern.includes('(?<!')) &&
      (pattern.includes('+') || pattern.includes('*'))) {
    return true;
  }
  return false;
}

// Convert string patterns to RegExp
function parsePatterns(patterns: string[]): RegExp[] {
  const regexps: RegExp[] = [];
  for (const p of patterns) {
    try {
      if (isUnsafeRegex(p)) {
        console.warn('[Flare Capture] Potentially unsafe pattern skipped:', p);
        continue;
      }
      regexps.push(new RegExp(p));
    } catch (e) {
      console.error('[Flare Capture] Invalid pattern:', p, e);
    }
  }
  return regexps;
}

function isStaticResource(url: string): boolean {
  if (!cachedConfig) return false;

  // Use cached compiled patterns if available
  if (!compiledPatternsCache || compiledPatternsCache.configVersion !== configVersion) {
    const patterns = parsePatterns(cachedConfig.excludePatterns);
    compiledPatternsCache = { patterns, configVersion };
  }

  return compiledPatternsCache.patterns.some(pattern => pattern.test(url));
}

function isAllowedDomain(url: string): boolean {
  if (!cachedConfig) return true; // No config = allow all
  if (!cachedConfig.enabled) return false; // Capture disabled
  if (cachedConfig.allowedDomains.length === 0) return true; // Empty = allow all

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    for (const domain of cachedConfig.allowedDomains) {
      // Wildcard matching *.example.com
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        if (hostname === baseDomain || hostname.endsWith('.' + baseDomain)) {
          return true;
        }
      } else if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Load config from storage
async function loadConfig(): Promise<void> {
  try {
    const result = await chrome.storage.local.get('captureConfig');
    if (result.captureConfig) {
      cachedConfig = result.captureConfig;
    } else {
      // Use defaults if no config set
      cachedConfig = {
        enabled: true,
        allowedDomains: [],
        excludePatterns: DEFAULT_EXCLUDE_PATTERNS.map(p => p.source),
      };
    }
    configVersion++;
    compiledPatternsCache = null; // Invalidate pattern cache
  } catch (e) {
    console.error('[Flare Capture] Failed to load config:', e);
  }
}

// Listen for config changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.captureConfig) {
    cachedConfig = changes.captureConfig.newValue;
    configVersion++;
    compiledPatternsCache = null; // Invalidate pattern cache
  }
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  loadConfig();
});

// Keep service worker alive with heartbeat
const HEARTBEAT_INTERVAL = 15000; // 15 seconds
let heartbeatIntervalId: number | undefined;

function startHeartbeat() {
  if (heartbeatIntervalId) return;
  heartbeatIntervalId = setInterval(() => {
    if (cachedConfig?.enabled) {
      // Heartbeat - service worker stays alive
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = undefined;
  }
}

// Cleanup on extension uninstall
chrome.runtime.onSuspend.addListener(() => {
  stopHeartbeat();
});

// Initialize on startup (service worker activation)
loadConfig();
startHeartbeat();

function broadcastRequest(request: CapturedRequest, tabId: number) {
  chrome.tabs.sendMessage(tabId, { type: 'CAPTURED_REQUEST', data: request })
    .catch(err => {
      // Tab might be closed or navigating, ignore
      if (!err.message.includes('Receiving end does not exist')) {
        console.error('[Flare Capture] Failed to send message:', err.message);
      }
    });
}

const handleBeforeSendHeaders = (
  details: chrome.webRequest.OnBeforeSendHeadersDetails
): chrome.webRequest.BlockingResponse | undefined => {
  if (!details.url.startsWith('http')) return undefined;

  // Filter out static resources
  if (isStaticResource(details.url)) {
    return undefined;
  }

  // Filter by allowed domains
  if (!isAllowedDomain(details.url)) {
    return undefined;
  }

  const request: CapturedRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    method: details.method,
    url: details.url,
    headers: Object.fromEntries(
      (details.requestHeaders || []).map((h: chrome.webRequest.HttpHeader) => [h.name, h.value || ''])
    ),
    timestamp: Date.now(),
  };

  // Send to the tab where the request originated
  if (details.tabId > 0) {
    broadcastRequest(request, details.tabId);
  }
  return undefined;
};

// Register listener
chrome.webRequest.onBeforeSendHeaders.addListener(
  handleBeforeSendHeaders,
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// Listen for config updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_CAPTURE_CONFIG') {
    const config = message.data;
    chrome.storage.local.set({ captureConfig: config }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Flare Capture] Failed to save config:', chrome.runtime.lastError.message);
      }
    });
    sendResponse({ received: true });
    return true;
  }
  // Handle GET_CAPTURE_CONFIG request from content script
  if (message.type === 'GET_CAPTURE_CONFIG') {
    loadConfig().then(() => {
      sendResponse({ config: cachedConfig });
    });
    return true; // Will respond async
  }
});