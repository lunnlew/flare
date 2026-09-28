export interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: number;
  requestBody?: string;
}