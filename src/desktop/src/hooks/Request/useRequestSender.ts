/**
 * useRequestSender - Encapsulates HTTP request sending logic
 *
 * Extracts sendRequest from RequestBuilder to reduce component size
 * and enable reuse. All state accessed via Zustand store selectors.
 */

import { useCallback, useRef, useEffect } from "react";
import { useRequestStore, useResponseStore, useEnvironmentStore, useScriptsStore, useScriptsState, useSettingsStore, getDefaultRequestState } from "../../store";
import { useToast } from "../../hooks/common/useToast";
import { substituteVariables, isAbortError, getErrorMessage } from "../../utils/string";
import { runPreRequestScript, runPostResponseScript, runInterceptors } from "../../utils/scriptRunner";
import { buildRequestHeaders, buildRequestQueryParams, buildUrlencodedBody, sanitizeUrlForId, generateRequestFingerprint, signAwsRequest } from "../../utils/request-builder";
import { readFileBase64 } from "../../services/api";
import { t } from "../../utils/i18n";
import type { HttpMethod, BodyType } from "../../constants/http";
import type { ResponseData } from "../../types/api";

interface UseRequestSenderOptions {
  sslVerify?: boolean;
}

// Stable reference for default state
const DEFAULT_STATE = getDefaultRequestState();

export function useRequestSender(options: UseRequestSenderOptions = {}) {
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Toast notifications
  const toast = useToast();

  // Request state - access current endpoint's state
  const currentEndpointId = useRequestStore((s) => s.currentEndpointId);
  const endpointStates = useRequestStore((s) => s.endpointStates);
  const executeRequest = useRequestStore((s) => s.executeRequest);
  const saveRequestAndResponse = useRequestStore((s) => s.saveRequestAndResponse);

  // Get the current request state
  const requestState = currentEndpointId
    ? (endpointStates[currentEndpointId] || DEFAULT_STATE)
    : DEFAULT_STATE;

  // Response state
  const setResponse = useResponseStore((s) => s.setResponse);
  const setLoading = useResponseStore((s) => s.setLoading);
  const setError = useResponseStore((s) => s.setError);
  const addToHistory = useResponseStore((s) => s.addToHistory);

  // Environment state
  const getVariablesMap = useEnvironmentStore((s) => s.getVariablesMap);
  const selectedEnv = useEnvironmentStore((s) => s.selectedEnv);
  const updateVariable = useEnvironmentStore((s) => s.updateVariable);
  const currentEnvRecord = getVariablesMap();

  // Scripts state
  const { preRequestScript, postResponseScript, scriptEnabled, interceptors } = useScriptsState();
  const addScriptLog = useScriptsStore((s) => s.addScriptLog);

  // Settings for URL history
  const addToUrlHistory = useSettingsStore((s) => s.addToUrlHistory);

  // SSL Certificate settings
  const sslCertConfig = useSettingsStore((s) => s.sslCertConfig);

  // Request settings from global settings
  const requestTimeout = useSettingsStore((s) => s.requestTimeout);
  const followRedirects = useSettingsStore((s) => s.followRedirects);

  // Derive values from requestState
  const method = requestState.method as HttpMethod;
  const url = requestState.url;
  const params = requestState.params;
  const headers = requestState.headers;
  const bodyType = requestState.bodyType as BodyType;
  const reqBody = requestState.reqBody;
  const urlencodedBody = requestState.urlencodedBody;
  const formData = requestState.formData;
  const graphqlVariables = requestState.graphqlVariables;
  const authType = requestState.authType as "none" | "bearer" | "basic" | "apiKey" | "oauth2" | "aws";
  const bearerToken = requestState.bearerToken;
  const bearerPrefix = requestState.bearerPrefix;
  const basicUsername = requestState.basicUsername;
  const basicPassword = requestState.basicPassword;
  const apiKeyName = requestState.apiKeyName;
  const apiKeyValue = requestState.apiKeyValue;
  const apiKeyLocation = requestState.apiKeyLocation;
  const awsAccessKey = requestState.awsAccessKey;
  const awsSecretKey = requestState.awsSecretKey;
  const awsRegion = requestState.awsRegion;
  const awsService = requestState.awsService;

  // Build functions
  const buildHeaders = useCallback(() => {
    return buildRequestHeaders({
      headers,
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
      awsAccessKey: requestState.awsAccessKey,
      awsSecretKey: requestState.awsSecretKey,
      awsRegion: requestState.awsRegion,
      awsService: requestState.awsService,
      env: currentEnvRecord,
    });
  }, [headers, authType, bearerToken, bearerPrefix, basicUsername, basicPassword, apiKeyName, apiKeyValue, apiKeyLocation, currentEnvRecord, requestState]);

  const buildQueryParams = useCallback(() => {
    return buildRequestQueryParams({
      params,
      authType,
      apiKeyName,
      apiKeyValue,
      apiKeyLocation,
      env: currentEnvRecord,
    });
  }, [params, authType, apiKeyName, apiKeyValue, apiKeyLocation, currentEnvRecord]);

  const getUrlencodedBodyString = useCallback(() => {
    return buildUrlencodedBody({ urlencodedBody, env: currentEnvRecord });
  }, [urlencodedBody, currentEnvRecord]);

  const sendRequest = useCallback(async () => {
    // Variable-substituted values
    const processedUrl = substituteVariables(url, { env: currentEnvRecord });
    const processedHeaders = headers.map(h => ({
      ...h,
      key: substituteVariables(h.key, { env: currentEnvRecord }),
      value: substituteVariables(h.value, { env: currentEnvRecord }),
    }));
    const processedBody = substituteVariables(reqBody, { env: currentEnvRecord });

    if (!processedUrl.trim()) {
      setError(t('common.error.urlRequired', useSettingsStore.getState().language));
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();
    const start = Date.now();

    // Script execution context
    const scriptContext = {
      method,
      url: processedUrl,
      headers: processedHeaders,
      body: processedBody,
      params,
      currentEnv: currentEnvRecord,
      onUpdateVariable: (key: string, value: string) => updateVariable(selectedEnv, "Default", key, value),
      onAddLog: addScriptLog,
    };

    // Execute pre-build interceptors if configured, otherwise use legacy script
    let finalMethod: HttpMethod = method;
    let finalUrl = processedUrl;
    let finalBody = processedBody;

    if (interceptors.length > 0) {
      // Use new interceptor pipeline
      const preBuildResult = runInterceptors({ ...scriptContext, interceptors, stage: 'preBuild' });
      if (preBuildResult.aborted) {
        setLoading(false);
        setError('请求被拦截器中止');
        return;
      }
      if (preBuildResult.errors.length > 0) {
        addScriptLog({ level: 'warn', message: `preBuild 警告: ${preBuildResult.errors.join(', ')}` });
      }
    } else if (scriptEnabled && preRequestScript.trim()) {
      // Legacy pre-request script
      const preResult = runPreRequestScript({ ...scriptContext, script: preRequestScript, scriptEnabled: true });
      if (preResult.modifiedRequest) {
        finalMethod = (preResult.modifiedRequest.method as HttpMethod) || method;
        finalUrl = preResult.modifiedRequest.url || processedUrl;
        finalBody = preResult.modifiedRequest.body || processedBody;
      }
    }

    // Build headers (include auth headers)
    let finalHeaders = { ...buildHeaders() };

    // Execute pre-send interceptors (can modify body/headers after building, can abort)
    if (interceptors.length > 0) {
      const preSendResult = runInterceptors({ ...scriptContext, interceptors, stage: 'preSend', method: finalMethod, url: finalUrl, headers: processedHeaders, body: finalBody });
      if (preSendResult.aborted) {
        setLoading(false);
        setError('请求被拦截器中止');
        return;
      }
      if (preSendResult.errors.length > 0) {
        addScriptLog({ level: 'warn', message: `preSend 警告: ${preSendResult.errors.join(', ')}` });
      }
    }

    try {
      let httpHeaders = finalHeaders;
      let body: string | undefined;
      if (["POST", "PUT", "PATCH"].includes(finalMethod)) {
        if (bodyType === "x-www-form-urlencoded") {
          body = getUrlencodedBodyString();
          httpHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        } else if (bodyType === "raw") {
          body = finalBody;
        } else if (bodyType === "form-data") {
          const formEntries: { key: string; value: string; isFile: boolean; filename?: string; mimeType?: string }[] = [];
          for (const f of formData) {
            if (!f.enabled || !f.key.trim()) continue;
            if (f.isFile && f.file) {
              const file = f.file;
              try {
                const content = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(new Error(`文件读取失败: ${file.name}`));
                  reader.readAsDataURL(file);
                });
                formEntries.push({ key: f.key, value: content, isFile: true, filename: file.name, mimeType: file.type || 'application/octet-stream' });
              } catch (e) {
                setError(`文件上传失败: ${getErrorMessage(e)}`);
                return;
              }
            } else if (!f.isFile) {
              formEntries.push({ key: substituteVariables(f.key, currentEnvRecord), value: substituteVariables(f.value, currentEnvRecord), isFile: false });
            }
          }
          body = JSON.stringify(formEntries);
          httpHeaders["Content-Type"] = "application/json";
        } else if (bodyType === "binary") {
          if (requestState.binaryFile?.content) body = requestState.binaryFile.content;
        } else if (bodyType === "graphql") {
          let graphqlVars = null;
          if (graphqlVariables) {
            try {
              graphqlVars = JSON.parse(substituteVariables(graphqlVariables, currentEnvRecord));
            } catch (e) {
              setError(`GraphQL 变量 JSON 格式错误: ${getErrorMessage(e)}`);
              return;
            }
          }
          body = JSON.stringify({ query: substituteVariables(reqBody, currentEnvRecord), variables: graphqlVars });
        }
      }

      // Check if cancelled before sending
      if (isCancelledRef.current) {
        throw new DOMException("Request cancelled", "AbortError");
      }

      const reqUrl = finalUrl;

      // Read SSL certificates if configured
      let clientCert: string | undefined;
      let clientKey: string | undefined;
      let caCert: string | undefined;

      if (sslCertConfig.clientCertEnabled) {
        try {
          if (sslCertConfig.clientCertFile) {
            clientCert = await readFileBase64(sslCertConfig.clientCertFile);
          }
          if (sslCertConfig.clientKeyFile) {
            clientKey = await readFileBase64(sslCertConfig.clientKeyFile);
          }
          if (sslCertConfig.caCertFile) {
            caCert = await readFileBase64(sslCertConfig.caCertFile);
          }
        } catch (e) {
          toast.error(t('common.error.sslCertReadFailed', useSettingsStore.getState().language));
        }
      }

      // AWS Signature Version 4 signing
      if (authType === "aws" && awsAccessKey && awsSecretKey && awsRegion && awsService) {
        httpHeaders = await signAwsRequest({
          method: finalMethod,
          url: reqUrl,
          headers: httpHeaders,
          body,
          accessKey: awsAccessKey,
          secretKey: awsSecretKey,
          region: awsRegion,
          service: awsService,
        });
      }

      const config = {
        method: finalMethod,
        url: reqUrl,
        headers: httpHeaders,
        body,
        queryParams: buildQueryParams(),
        signal: !isCancelledRef.current,
        sslVerify: options.sslVerify ?? requestState.sslVerify,
        timeout: requestTimeout,
        followRedirects,
        clientCert: clientCert || undefined,
        clientKey: clientKey || undefined,
        caCert: caCert || undefined,
        retry: requestState.retryConfig?.enabled ? {
          maxRetries: requestState.retryConfig.maxRetries,
          retryDelay: requestState.retryConfig.retryDelay,
          retryOn: [0, 503, 504, 429, 408],
        } : undefined,
      };
      const raw = await executeRequest(config);

      // Check if cancelled after receiving response
      if (isCancelledRef.current) {
        throw new DOMException("Request cancelled", "AbortError");
      }

      // Check if the response indicates cancellation
      if (raw.error && raw.error.toLowerCase().includes("cancelled")) {
        throw new DOMException("Request cancelled", "AbortError");
      }

      const total = Date.now() - start;
      // Read currentEndpointId directly from store to avoid stale closure
      const activeEndpointId = useRequestStore.getState().currentEndpointId;

      // Build query params string from the built query params object
      const queryParams = buildQueryParams();
      const queryParamsStr: Record<string, string> = {};
      Object.entries(queryParams).forEach(([k, v]) => { queryParamsStr[k] = String(v); });

      const newResponse = {
        ...raw,
        time: total,
        id: crypto.randomUUID(),
        endpointId: activeEndpointId || undefined,
        request: {
          method: finalMethod,
          url: reqUrl,
          headers: httpHeaders,
          body,
          queryParams: queryParamsStr,
        },
      };
      setResponse(newResponse);
      addToHistory(newResponse);
      // Add URL to history for autocomplete
      addToUrlHistory(url);

      // Execute post-response script or interceptors
      if (interceptors.length > 0) {
        // Use interceptor pipeline for postResponse
        const postResult = runInterceptors({
          ...scriptContext,
          interceptors,
          stage: 'postResponse',
          method: finalMethod,
          url: finalUrl,
          headers: processedHeaders,
          body: finalBody,
          params,
          response: newResponse,
        });
        if (postResult.errors.length > 0) {
          addScriptLog({ level: 'warn', message: `postResponse 警告: ${postResult.errors.join(', ')}` });
        }
      } else if (scriptEnabled && postResponseScript.trim()) {
        // Legacy post-response script
        runPostResponseScript({
          script: postResponseScript,
          scriptEnabled: true,
          method: finalMethod,
          url: finalUrl,
          headers: processedHeaders,
          body: finalBody,
          params,
          response: newResponse,
          currentEnv: currentEnvRecord,
          onUpdateVariable: (key, value) => updateVariable(selectedEnv, "Default", key, value),
          onAddLog: addScriptLog,
        });
      }

      // Save response to backend with request_id linking
      try {
        const fingerprint = generateRequestFingerprint(params, headers, reqBody, bodyType);
        const baseRequestId = `req_${method.toLowerCase()}_${sanitizeUrlForId(reqUrl)}_${fingerprint}`;

        await saveRequestAndResponse(baseRequestId, {
          method,
          url,
          params,
          headers,
          bodyType,
          reqBody,
          urlencodedBody,
          formData,
          graphqlVariables,
          authType,
          authConfig: {
            bearerToken: bearerToken || '',
            bearerPrefix: bearerPrefix || '',
            basicUsername: basicUsername || '',
            basicPassword: basicPassword || '',
            apiKeyName: apiKeyName || '',
            apiKeyValue: apiKeyValue || '',
            apiKeyLocation: apiKeyLocation || '',
          },
        }, newResponse);
      } catch (e) {
        // Non-critical - response already shown to user
      }
    } catch (e) {
      if (isAbortError(e)) {
        setError(t('common.error.requestCancelled', useSettingsStore.getState().language));
      } else {
        setError(getErrorMessage(e));
      }

      // Execute postError interceptors on error
      if (interceptors.length > 0) {
        const errorResponse: ResponseData = {
          id: crypto.randomUUID(),
          status: 0,
          statusText: 'Error',
          body: getErrorMessage(e),
          headers: {},
          error: getErrorMessage(e),
          time: Date.now() - start,
        };
        runInterceptors({
          ...scriptContext,
          interceptors,
          stage: 'postError',
          method: finalMethod,
          url: finalUrl,
          headers: processedHeaders,
          body: finalBody,
          params,
          response: errorResponse,
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    url, headers, reqBody, params, graphqlVariables, bodyType, urlencodedBody, formData,
    authType, bearerToken, bearerPrefix, basicUsername, basicPassword, apiKeyName, apiKeyValue, apiKeyLocation,
    method, requestState, currentEnvRecord, selectedEnv, interceptors, scriptEnabled, preRequestScript, postResponseScript,
    options.sslVerify, sslCertConfig, buildHeaders, buildQueryParams, getUrlencodedBodyString,
    setResponse, setLoading, setError, addToHistory, updateVariable, addScriptLog, executeRequest, saveRequestAndResponse,
    requestTimeout, followRedirects,
  ]);

  const cancelRequest = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Ref for external access (keyboard shortcuts)
  const sendRequestRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Keep ref updated
  useEffect(() => {
    sendRequestRef.current = sendRequest;
  }, [sendRequest]);

  return { sendRequest, cancelRequest, sendRequestRef };
}