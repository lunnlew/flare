import { useMemo, useCallback } from "react";
import { useEnvironmentStore, useUIStore, useRequestState, useSettingsStore } from "../../store";
import { substituteVariables } from "../../utils/string";
import { useNotificationStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

const LANGUAGES = [
  { value: "curl", label: "cURL" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "php", label: "PHP" },
] as const;

type Language = typeof LANGUAGES[number]["value"];

export function CodeGenPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const codeLang = useUIStore((s) => s.codeGenLang as Language) || "curl";
  const setCodeGenLang = useUIStore((s) => s.setCodeGenLang);
  const showToast = useNotificationStore((s) => s.showToast);

  // Get request state from store
  const requestState = useRequestState();
  const method = requestState.method;
  const bodyType = requestState.bodyType;
  const reqBody = requestState.reqBody;
  const params = requestState.params;
  const headers = requestState.headers;
  const urlencodedBody = requestState.urlencodedBody;

  // Get current environment for variable substitution
  const getVariablesMap = useEnvironmentStore((s) => s.getVariablesMap);
  const envRecord = getVariablesMap();

  // Build URL with variable substitution
  const processedUrl = useMemo(() => {
    const subbedUrl = substituteVariables(requestState.url, envRecord);
    const enabled = params.filter(p => p.enabled && p.key.trim());
    if (enabled.length === 0) return subbedUrl;
    const qs = enabled.map(p =>
      `${encodeURIComponent(substituteVariables(p.key, envRecord))}=${encodeURIComponent(substituteVariables(p.value, envRecord))}`
    ).join("&");
    return `${subbedUrl}${subbedUrl.includes("?") ? "&" : "?"}${qs}`;
  }, [requestState.url, params, envRecord]);

  // Build headers with variable substitution
  const buildHeaders = useMemo(() => {
    const result: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
      result[substituteVariables(h.key, envRecord)] = substituteVariables(h.value, envRecord);
    });
    return result;
  }, [headers, envRecord]);

  // Build urlencoded body
  const buildUrlencodedBody = useMemo(() => {
    return urlencodedBody
      .filter(p => p.enabled && p.key.trim())
      .map(p => `${encodeURIComponent(substituteVariables(p.key, envRecord))}=${encodeURIComponent(substituteVariables(p.value, envRecord))}`)
      .join("&");
  }, [urlencodedBody, envRecord]);

  // Generate code based on current language
  const generatedCode = useMemo(() => {
    const reqUrl = processedUrl;
    const reqHeaders = buildHeaders;
    const reqBodyStr = ["POST", "PUT", "PATCH"].includes(method) ? (bodyType === "x-www-form-urlencoded" ? buildUrlencodedBody : reqBody) : undefined;
    const headerStr = Object.entries(reqHeaders).map(([k, v]) => `-H "${k}: ${v}"`).join(" ");
    const bodyStr = reqBodyStr ? `-d '${reqBodyStr}'` : "";
    const headersJson = JSON.stringify(reqHeaders, null, 2);

    switch (codeLang) {
      case "curl":
        return `curl -X ${method} "${reqUrl}" ${headerStr} ${bodyStr}`.trim();
      case "python":
        return `import requests

url = "${reqUrl}"
headers = ${headersJson}
${reqBodyStr ? `data = ${JSON.stringify(reqBodyStr, null, 2)}
response = requests.${method.toLowerCase()}(url, headers=headers, json=data)` : `response = requests.${method.toLowerCase()}(url, headers=headers)`}
print(response.status_code)
print(response.json())`;
      case "javascript":
        return `const response = await fetch("${reqUrl}", {
  method: "${method}",
  headers: ${headersJson},
  ${reqBodyStr ? `body: JSON.stringify(${JSON.stringify(reqBodyStr)}),` : ""}
});

if (!response.ok) {
  throw new Error(\`HTTP error! status: \${response.status}\`);
}

const data = await response.json();`;
      case "go":
        return `package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
)

func main() {
  ${reqBodyStr ? `body, _ := json.Marshal(${JSON.stringify(reqBodyStr)})

  req, err := http.NewRequest("${method}", "${reqUrl}", bytes.NewBuffer(body))` : `req, err := http.NewRequest("${method}", "${reqUrl}", nil)`}
  if err != nil {
    panic(err)
  }
${Object.entries(reqHeaders).map(([k, v]) => `  req.Header.Set("${k}", "${v}")`).join("\n")}

  client := &http.Client{}
  resp, err := client.Do(req)
  if err != nil {
    panic(err)
  }
  defer resp.Body.Close()

  data, _ := io.ReadAll(resp.Body)
  fmt.Println(string(data))
}`;
      case "java":
        return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
  public static void main(String[] args) throws Exception {
    HttpClient client = HttpClient.newHttpClient();
    HttpRequest.Builder builder = HttpRequest.newBuilder()
      .uri(URI.create("${reqUrl}"))
      .method("${method}", ${reqBodyStr ? `HttpRequest.BodyPublishers.ofString("${reqBodyStr.replace(/"/g, '\\"')}")` : 'HttpRequest.BodyPublishers.noBody()'});
${Object.entries(reqHeaders).map(([k, v]) => `    builder.header("${k}", "${v}");`).join("\n")}
    HttpRequest request = builder.build();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    System.out.println(response.body());
  }
}`;
      case "php":
        return `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${reqUrl}");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");
curl_setopt($ch, CURLOPT_HTTPHEADER, [${Object.entries(reqHeaders).map(([k, v]) => `"${k}: ${v}"`).join(", ")}]);
${reqBodyStr ? `curl_setopt($ch, CURLOPT_POSTFIELDS, '${reqBodyStr}');` : ''}
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`;
      default:
        return "";
    }
  }, [codeLang, method, processedUrl, buildHeaders, bodyType, buildUrlencodedBody, reqBody]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    showToast(t('codegen.codeCopied'), "success");
  }, [generatedCode, showToast]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Toolbar */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('codegen.title')}</span>
        <select
          value={codeLang}
          onChange={e => setCodeGenLang(e.target.value)}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 0022h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m00l3-3m-3 3l3 3" />
          </svg>
          {t('codegen.copyCode')}
        </button>
      </div>

      {/* Code Display */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
          {generatedCode ||<span style={{ color: 'var(--text-muted)' }}>{t('codegen.noRequestData')}</span>}
        </pre>
      </div>
    </div>
  );
}