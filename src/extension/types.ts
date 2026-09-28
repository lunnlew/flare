export interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: number;
  requestBody?: string;
}

export const CAPTURE_WS_URL = 'ws://localhost:7890';