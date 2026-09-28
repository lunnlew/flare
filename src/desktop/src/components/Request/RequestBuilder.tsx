import { useState, useCallback, useEffect, useRef } from "react";
import { ToastContainer } from "../Common/Toast";
import { UrlBar } from "./UrlBar";
import { ResponsePanel } from "../Response/ResponsePanel";
import { RequestPanel } from "./RequestPanel";
import { ConfirmDialog } from "../Common/ConfirmDialog";
import { SaveDialog } from "../Common/SaveDialog";
import { CodeGenPanel } from "../Common/CodeGenPanel";
import { useRequestStore, useCollectionStore, useSettingsStore, useUIStore, useRequestState, useResponseData, getDefaultRequestState, useNotificationStore, useToasts, useEnvironmentStore } from "../../store";
import type { SavedRequest } from "../../store/collectionStore";
import { substituteVariables, getErrorMessage } from "../../utils/string";
import { buildRequestUrl, buildRequestHeaders, buildUrlencodedBody } from "../../utils/request-builder";
import { escapeForCurl } from "../../utils/RequestUtils";
import { useUrlParseConfirmation } from "../../hooks/Request/useUrlParseConfirmation";
import { useRequestSender } from "../../hooks/Request/useRequestSender";
import { HttpMethod, BodyType } from "../../constants/http";
import type { EndpointData } from "../../types/api";
import { logger } from "../../utils/logger";
import { METHOD_STYLES } from "../../styles/method-colors";
import { useTranslation } from "../../utils/i18n";

const requestLogger = logger.child('request');

export type { HttpMethod, BodyType };

// Endpoint Tabs Component for multi-tab support
function EndpointTabs() {
  const openEndpointTabs = useRequestStore((s) => s.openEndpointTabs);
  const currentEndpointId = useRequestStore((s) => s.currentEndpointId);
  const switchEndpointTab = useRequestStore((s) => s.switchEndpointTab);
  const closeEndpointTab = useRequestStore((s) => s.closeEndpointTab);
  const closeTabsToRight = useRequestStore((s) => s.closeTabsToRight);
  const closeTabsToLeft = useRequestStore((s) => s.closeTabsToLeft);
  const closeOtherTabs = useRequestStore((s) => s.closeOtherTabs);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu]);

  // Close context menu on scroll
  useEffect(() => {
    const handleScroll = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("scroll", handleScroll, true);
      return () => window.removeEventListener("scroll", handleScroll, true);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleCloseRight = () => {
    if (contextMenu) {
      closeTabsToRight(contextMenu.tabId);
      setContextMenu(null);
    }
  };

  const handleCloseLeft = () => {
    if (contextMenu) {
      closeTabsToLeft(contextMenu.tabId);
      setContextMenu(null);
    }
  };

  const handleClose = () => {
    if (contextMenu) {
      closeEndpointTab(contextMenu.tabId);
      setContextMenu(null);
    }
  };

  const handleCloseOthers = () => {
    if (contextMenu) {
      closeOtherTabs(contextMenu.tabId);
      setContextMenu(null);
    }
  };

  if (openEndpointTabs.length === 0) return null;

  return (
    <>
      <div
        className="flex items-center border-b overflow-x-auto"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
      >
        {openEndpointTabs.map((tab) => {
          const isActive = tab.id === currentEndpointId;
          const colors = METHOD_STYLES[tab.method.toUpperCase()] || { bg: '#6b7280', color: '#fff' };

          return (
            <div
              key={tab.id}
              className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer shrink-0 border-r relative"
              style={{
                backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
                borderColor: 'var(--border-color)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onClick={() => switchEndpointTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            >
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: colors.bg, color: colors.color }}
              >
                {tab.method}
              </span>
              <span className="max-w-[150px] truncate" title={tab.path}>
                {tab.name}
              </span>
              {openEndpointTabs.length >= 1 && (
                <button
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-opacity-20 hover:bg-gray-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeEndpointTab(tab.id);
                  }}
                  style={{ color: 'var(--text-muted)' }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 py-1 rounded-lg shadow-xl min-w-32"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={handleClose}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
            style={{ color: 'var(--danger)' }}
          >
            {t('request.close')}
          </button>
          <button
            onClick={handleCloseLeft}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('request.closeLeft')}
          </button>
          <button
            onClick={handleCloseRight}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('request.closeRight')}
          </button>
          <button
            onClick={handleCloseOthers}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('request.closeOthers')}
          </button>
        </div>
      )}
    </>
  );
}

interface RequestBuilderProps {
  initialUrl?: string;
  initialEndpoint?: EndpointData;
  onRequestChange?: (method: HttpMethod, url: string) => void;
}

export function RequestBuilder({ initialUrl, initialEndpoint, onRequestChange }: RequestBuilderProps) {
  // Request state - subscribes to current endpoint's state via useRequestState()
  const requestState = useRequestState();
  const setRequestState = useRequestStore((s) => s.setRequestState);
  const autoParseUrl = useSettingsStore((s) => s.autoParseUrl);
  const leftPanelWidth = useSettingsStore((s) => s.leftPanelWidth);
  const topPanelHeight = useSettingsStore((s) => s.topPanelHeight);
  const setLeftPanelWidth = useSettingsStore((s) => s.setLeftPanelWidth);
  const setTopPanelHeight = useSettingsStore((s) => s.setTopPanelHeight);

  // Response state from response store (unified state management)
  const { response: currentResponse, isLoading } = useResponseData();

  // UI state from stores
  const showUrlParseModal = useUIStore((s) => s.showUrlParseModal);
  const setShowUrlParseModal = useUIStore((s) => s.setShowUrlParseModal);
  const showCodeGen = useUIStore((s) => s.showCodeGen);
  const pendingParseParams = useUIStore((s) => s.pendingParseParams);
  const setPendingParseParams = useUIStore((s) => s.setPendingParseParams);
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  // Save dialog state from UI store
  const showSaveDialog = useUIStore((s) => s.showSaveDialog);
  const setShowSaveDialog = useUIStore((s) => s.setShowSaveDialog);
  const [currentSavedRequestId, setCurrentSavedRequestId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Notification state from notification store (toast + dialog consolidated)
  const showToast = useNotificationStore((s) => s.showToast);
  const showDialog = useNotificationStore((s) => s.showDialog);
  const confirmDialog = useNotificationStore((s) => s.dialog);
  const confirm = useNotificationStore((s) => s.confirm);
  const cancel = useNotificationStore((s) => s.cancel);
  const toasts = useToasts();
  const hideToast = useNotificationStore((s) => s.hideToast);

  // Environment state for variable substitution
  const getVariablesMap = useEnvironmentStore((s) => s.getVariablesMap);
  const currentEnvRecord = getVariablesMap();

  // Language and i18n
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Use request sender hook
  const { sendRequest, cancelRequest, sendRequestRef } = useRequestSender({});

  const handleSaveRequest = useCallback(async () => {
    try {
      setSaveStatus('saving');

      const requestState = useRequestStore.getState().getRequestState();

      // Check if request with same method+url already exists
      const existing = useCollectionStore.getState().findSavedRequestByMethodUrl(
        requestState.method,
        requestState.url
      );

      if (existing) {
        // Update existing request
        const updated: Partial<SavedRequest> = {
          params: requestState.params,
          headers: requestState.headers,
          bodyType: requestState.bodyType,
          reqBody: requestState.reqBody,
          urlencodedBody: requestState.urlencodedBody,
          formData: requestState.formData,
          graphqlVariables: requestState.graphqlVariables,
          authType: requestState.authType,
          bearerToken: requestState.bearerToken,
          bearerPrefix: requestState.bearerPrefix,
          basicUsername: requestState.basicUsername,
          basicPassword: requestState.basicPassword,
          apiKeyName: requestState.apiKeyName,
          apiKeyValue: requestState.apiKeyValue,
          apiKeyLocation: requestState.apiKeyLocation,
          oauth2AuthUrl: requestState.oauth2AuthUrl,
          oauth2AccessTokenUrl: requestState.oauth2AccessTokenUrl,
          oauth2TokenType: requestState.oauth2TokenType,
          oauth2ClientId: requestState.oauth2ClientId,
          oauth2ClientSecret: requestState.oauth2ClientSecret,
          oauth2AccessToken: requestState.oauth2AccessToken,
          oauth2RefreshToken: requestState.oauth2RefreshToken,
          oauth2Scope: requestState.oauth2Scope,
          awsAccessKey: requestState.awsAccessKey,
          awsSecretKey: requestState.awsSecretKey,
          awsRegion: requestState.awsRegion,
          awsService: requestState.awsService,
          sslVerify: requestState.sslVerify,
          updatedAt: Date.now(),
        };
        useCollectionStore.getState().updateRequestInCollection(existing.collection.id, existing.request.id, updated);
        setSaveStatus('success');
        showToast(t('request.updated'), 'success');
      } else {
        // Get or create default collection
        let collections = useCollectionStore.getState().collections;
        let targetCollection = collections.find(c => c.id === useUIStore.getState().workspaceSelectedCollection);

        if (!targetCollection) {
          if (collections.length === 0) {
            useCollectionStore.getState().addCollection({
              id: `col-default-${Date.now()}`,
              name: t('request.myCollection'),
              requests: [],
            });
            collections = useCollectionStore.getState().collections;
          }
          targetCollection = collections[0];
        }

        // Build new SavedRequest
        const savedRequest: SavedRequest = {
          id: `req-${Date.now()}`,
          name: requestState.url.split('?')[0].split('/').pop() || t('request.unnamedRequest'),
          method: requestState.method,
          url: requestState.url,
          params: requestState.params,
          headers: requestState.headers,
          bodyType: requestState.bodyType,
          reqBody: requestState.reqBody,
          urlencodedBody: requestState.urlencodedBody,
          formData: requestState.formData,
          graphqlVariables: requestState.graphqlVariables,
          authType: requestState.authType,
          bearerToken: requestState.bearerToken,
          bearerPrefix: requestState.bearerPrefix,
          basicUsername: requestState.basicUsername,
          basicPassword: requestState.basicPassword,
          apiKeyName: requestState.apiKeyName,
          apiKeyValue: requestState.apiKeyValue,
          apiKeyLocation: requestState.apiKeyLocation,
          oauth2AuthUrl: requestState.oauth2AuthUrl,
          oauth2AccessTokenUrl: requestState.oauth2AccessTokenUrl,
          oauth2TokenType: requestState.oauth2TokenType,
          oauth2ClientId: requestState.oauth2ClientId,
          oauth2ClientSecret: requestState.oauth2ClientSecret,
          oauth2AccessToken: requestState.oauth2AccessToken,
          oauth2RefreshToken: requestState.oauth2RefreshToken,
          oauth2Scope: requestState.oauth2Scope,
          awsAccessKey: requestState.awsAccessKey,
          awsSecretKey: requestState.awsSecretKey,
          awsRegion: requestState.awsRegion,
          awsService: requestState.awsService,
          sslVerify: requestState.sslVerify,
          createdAt: Date.now(),
        };

        useCollectionStore.getState().addRequestToCollection(targetCollection.id, savedRequest);
        setSaveStatus('success');
        showToast(`${t('request.savedTo')} ${targetCollection.name}`, 'success');
      }

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      requestLogger.error('handleSaveRequest failed', { error: getErrorMessage(e) });
      setSaveStatus('error');
      showToast(`${t('request.saveFailed')}: ${getErrorMessage(e)}`, 'error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, []);

  const handleDeleteRequest = useCallback(async () => {
    if (!currentSavedRequestId) return;

    const result = await useRequestStore.getState().deleteRequest(currentSavedRequestId);

    if (result.success) {
      // Use store action to remove from local collection
      useCollectionStore.getState().removeRequestFromCollection('saved-requests', currentSavedRequestId);
      setCurrentSavedRequestId(null);
      showToast(t('request.deleted'), 'success');
    } else {
      showToast(`${t('request.deleteFailed')}: ${result.error}`, 'error');
    }
  }, [currentSavedRequestId, showToast]);

  // Open save dialog with current request name
  const openSaveDialog = useCallback(() => {
    // Check if this request is already saved using store method
    const existing = useCollectionStore.getState().findSavedRequestByMethodUrl(
      requestState.method,
      requestState.url
    );

    setCurrentSavedRequestId(existing?.request.id || null);
    setShowSaveDialog(true);
  }, [requestState.method, requestState.url]);

  // Keyboard shortcuts (Ctrl+S: save, Ctrl+Enter: send, Shift+Enter: send & new request, Ctrl+Shift+C: copy curl, Ctrl+L: focus URL, Ctrl+Shift+Delete: clear request)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        openSaveDialog();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) sendRequestRef.current();
      }
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) {
          sendRequestRef.current();
          // Shift+Enter: send and clear URL for new request (pragmatic "new tab" without tab UI)
          setRequestState({ url: "" });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const curlCmd = generateCurlCommand();
        navigator.clipboard.writeText(curlCmd);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        document.getElementById('url-input')?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Delete') {
        e.preventDefault();
        showDialog({
          message: t('request.clearConfirm'),
          confirmText: t('request.confirm'),
          cancelText: t('request.cancel'),
          destructive: false,
          onConfirm: () => {
            setRequestState(getDefaultRequestState());
          },
          onCancel: () => {}
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSaveDialog, isLoading, setRequestState, getDefaultRequestState, showDialog]);

  // Derive individual values from requestState
  const method = requestState.method as HttpMethod;
  const url = requestState.url;
  const params = requestState.params;
  const headers = requestState.headers;
  const bodyType = requestState.bodyType as BodyType;
  const reqBody = requestState.reqBody;
  const urlencodedBody = requestState.urlencodedBody;
  const authType = requestState.authType as "none" | "bearer" | "basic" | "apiKey" | "oauth2" | "aws";
  const bearerToken = requestState.bearerToken;
  const bearerPrefix = requestState.bearerPrefix;
  const basicUsername = requestState.basicUsername;
  const basicPassword = requestState.basicPassword;
  const apiKeyName = requestState.apiKeyName;
  const apiKeyValue = requestState.apiKeyValue;
  const apiKeyLocation = requestState.apiKeyLocation;
  // OAuth2 and AWS - used by AuthPanel via RequestPanel
  const activeTab = requestState.activeTab;

  // Track if this is the initial load of an endpoint (for preserving persisted state)
  const endpointLoadedRef = useRef<string>('');

  // Load endpoint via store action (centralized endpoint loading logic)
  useEffect(() => {
    if (!initialEndpoint && !initialUrl) return;

    // Build endpoint identifier using method+path only (same as store)
    const endpointId = `${initialEndpoint?.method || 'GET'}:${initialEndpoint?.path || ''}`;

    // If we've already loaded this exact endpoint, skip (preserves all persisted state)
    if (endpointLoadedRef.current === endpointId) return;
    endpointLoadedRef.current = endpointId;

    // Only open a new tab if currentEndpointId is null (not restored from persistence)
    // This prevents overwriting the restored currentEndpointId when Workspace re-renders
    const currentEndpointId = useRequestStore.getState().currentEndpointId;
    if (currentEndpointId === null) {
      useRequestStore.getState().openEndpointTab(initialEndpoint ?? null, initialUrl);
    }
  }, [initialEndpoint, initialUrl]);

  // Notify parent of method/url changes
  useEffect(() => {
    if (onRequestChange) onRequestChange(method, url);
  }, [method, url, onRequestChange]);

  // Computed values with variable substitution (including response variables)
  const processedUrl = substituteVariables(url, { env: currentEnvRecord, response: currentResponse });
  const processedHeaders = headers.map(h => ({ ...h, key: substituteVariables(h.key, { env: currentEnvRecord, response: currentResponse }), value: substituteVariables(h.value, { env: currentEnvRecord, response: currentResponse }) }));

  // Build functions for curl generation
  const buildHeaders = useCallback(() => {
    return buildRequestHeaders({
      headers: processedHeaders,
      authType,
      bearerToken,
      bearerPrefix,
      basicUsername,
      basicPassword,
      apiKeyName,
      apiKeyValue,
      apiKeyLocation,
      oauth2AccessToken: requestState.oauth2AccessToken,
      oauth2TokenType: requestState.oauth2TokenType,
      env: currentEnvRecord,
    });
  }, [processedHeaders, authType, bearerToken, bearerPrefix, basicUsername, basicPassword, apiKeyName, apiKeyValue, apiKeyLocation, currentEnvRecord, requestState.oauth2AccessToken, requestState.oauth2TokenType]);

  const getUrlencodedBodyString = useCallback(() => {
    return buildUrlencodedBody({ urlencodedBody, env: currentEnvRecord });
  }, [urlencodedBody, currentEnvRecord]);

  // URL query parameter parsing with confirmation modal
  const parsedUrlParams = useUrlParseConfirmation({ processedUrl });
  const lastParsedUrlRef = useRef<string>("");

  // Handle URL param parsing with modal confirmation
  useEffect(() => {
    if (!processedUrl || parsedUrlParams.length === 0) return;

    // Check if this URL was already parsed (avoid re-triggering)
    if (lastParsedUrlRef.current === processedUrl) return;
    lastParsedUrlRef.current = processedUrl;

    if (autoParseUrl) {
      // Auto-apply without modal
      setRequestState({ params: parsedUrlParams });
    } else {
      // Show modal to ask user
      setPendingParseParams(parsedUrlParams);
      setShowUrlParseModal(true);
    }
  }, [processedUrl, parsedUrlParams, autoParseUrl, setRequestState]);

  const handleParseUrlConfirm = () => {
    setRequestState({ params: pendingParseParams });
    setShowUrlParseModal(false);
    setPendingParseParams([]);
  };

  const handleParseUrlCancel = () => {
    setShowUrlParseModal(false);
    setPendingParseParams([]);
  };

  const setActiveTab = useCallback((t: string) => setRequestState({ activeTab: t }), [setRequestState]);

  const buildUrl = useCallback(() => {
    return buildRequestUrl({ baseUrl: processedUrl, params, env: currentEnvRecord });
  }, [processedUrl, params, currentEnvRecord]);

  const generateCurlCommand = useCallback(() => {
    const reqUrl = buildUrl();
    const reqHeaders = buildHeaders();
    const bodyForCurl = ["POST", "PUT", "PATCH"].includes(method) ? (bodyType === "x-www-form-urlencoded" ? getUrlencodedBodyString() : reqBody) : undefined;
    const headerStr = Object.entries(reqHeaders).map(([k, v]) => `-H "${k}: ${v}"`).join(" ");
    const bodyStr = bodyForCurl ? `-d '${escapeForCurl(bodyForCurl)}'` : "";
    return `curl -X ${method} "${reqUrl}" ${headerStr} ${bodyStr}`.trim();
  }, [method, bodyType, reqBody, buildUrl, buildHeaders, getUrlencodedBodyString]);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Endpoint Tabs */}
      <EndpointTabs />
      <UrlBar
        onSend={sendRequest}
        onCancel={cancelRequest}
        onSave={handleSaveRequest}
        saveStatus={saveStatus}
      />
      {showCodeGen && (
        <div className="h-[200px] shrink-0 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <CodeGenPanel />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex overflow-hidden" style={{ flexDirection: layoutMode === 'vertical' ? 'column' : 'row' }}>
        {/* Request Panel */}
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            width: layoutMode === 'horizontal' ? `${leftPanelWidth}%` :
                   layoutMode === 'request-focus' ? '80%' :
                   layoutMode === 'response-focus' ? '20%' : '100%',
            height: layoutMode === 'vertical' ? `${topPanelHeight}%` : '100%'
          }}
        >
          <RequestPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            requestState={requestState}
            setRequestState={setRequestState}
            currentEnv={currentEnvRecord}
          />
        </div>

        {/* Resize Handle */}
        {(layoutMode === 'horizontal' || layoutMode === 'vertical') && (
          <ResizeHandle
            direction={layoutMode}
            initialValue={layoutMode === 'horizontal' ? leftPanelWidth : topPanelHeight}
            onChange={layoutMode === 'horizontal' ? setLeftPanelWidth : setTopPanelHeight}
          />
        )}

        {/* Response Panel */}
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            width: layoutMode === 'vertical' ? '100%' : (
              layoutMode === 'horizontal' ? `${100 - leftPanelWidth}%` :
              layoutMode === 'request-focus' ? '20%' : '80%'
            ),
            height: layoutMode === 'vertical' ? `${100 - topPanelHeight}%` : '100%'
          }}
        >
          <ResponsePanel />
        </div>
      </div>

      {/* URL Parse Confirmation Modal */}
      {showUrlParseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-lg shadow-xl w-[400px]" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('request.parseUrl')}</h3>
            </div>
            <div className="p-4">
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {t('request.urlHasParams')}
              </p>
              <div className="p-2 rounded text-xs font-mono max-h-32 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {pendingParseParams.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <span style={{ color: 'var(--accent)' }}>{p.key}</span>
                    <span>=</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 flex justify-end gap-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={handleParseUrlCancel}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {t('request.cancel')}
              </button>
              <button
                onClick={handleParseUrlConfirm}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {t('request.parse')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <ToastContainer toasts={toasts} onHide={hideToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message || ""}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        destructive={confirmDialog.destructive}
        onConfirm={confirm}
        onCancel={cancel}
      />

      {/* Save Dialog */}
      <SaveDialog
        isOpen={showSaveDialog}
        requestState={requestState}
        savedRequestId={currentSavedRequestId}
        onSave={handleSaveRequest}
        onDelete={handleDeleteRequest}
        onClose={() => setShowSaveDialog(false)}
        isSaving={saveStatus === 'saving'}
      />
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  initialValue: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function ResizeHandle({ direction, initialValue, onChange, min = 20, max = 80 }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handlersRef = useRef<{ move: ((e: MouseEvent) => void) | null; up: (() => void) | null }>({ move: null, up: null });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const axis = direction === "horizontal" ? "clientX" : "clientY";
    const startPos = e[axis];
    const startValue = initialValue;
    const containerSize = direction === "horizontal"
      ? (e.currentTarget.parentElement as HTMLElement)?.clientWidth || window.innerWidth
      : (e.currentTarget.parentElement as HTMLElement)?.clientHeight || window.innerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent[axis] - startPos;
      const newValue = startValue + (delta / containerSize) * 100;
      onChange(Math.min(max, Math.max(min, newValue)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (handlersRef.current.move) {
        document.removeEventListener("mousemove", handlersRef.current.move);
      }
      if (handlersRef.current.up) {
        document.removeEventListener("mouseup", handlersRef.current.up);
      }
      handlersRef.current.move = null;
      handlersRef.current.up = null;
    };

    handlersRef.current.move = handleMouseMove;
    handlersRef.current.up = handleMouseUp;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [direction, initialValue, onChange, min, max]);

  // Cleanup on unmount during drag
  useEffect(() => {
    return () => {
      if (handlersRef.current.move) {
        document.removeEventListener("mousemove", handlersRef.current.move);
      }
      if (handlersRef.current.up) {
        document.removeEventListener("mouseup", handlersRef.current.up);
      }
    };
  }, []);

  return (
    <div
      className={
        direction === "horizontal"
          ? "w-1 cursor-col-resize flex items-center justify-center shrink-0"
          : "h-1 cursor-row-resize flex items-center justify-center shrink-0"
      }
      style={{ backgroundColor: isDragging ? "var(--accent)" : "var(--border-color)" }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={direction === "horizontal" ? "w-0.5 h-12 rounded-full" : "w-12 h-0.5 rounded-full"}
        style={{ backgroundColor: "var(--text-muted)" }}
      />
    </div>
  );
}