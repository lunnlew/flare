import type { KeyValue } from '../types/http';
export type { KeyValue };

export const HEADER_PRESETS = [
  { name: "JSON API", headers: [{ key: "Content-Type", value: "application/json", enabled: true }, { key: "Accept", value: "application/json", enabled: true }] },
  { name: "Form Submit", headers: [{ key: "Content-Type", value: "application/x-www-form-urlencoded", enabled: true }] },
  { name: "File Upload", headers: [{ key: "Content-Type", value: "multipart/form-data", enabled: true }] },
  { name: "Auth Bearer", headers: [{ key: "Authorization", value: "Bearer {{token}}", enabled: true }] },
  { name: "Auth Basic", headers: [{ key: "Authorization", value: "Basic {{credentials}}", enabled: true }] },
  { name: "CORS", headers: [{ key: "Access-Control-Allow-Origin", value: "*", enabled: true }] },
];

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] as const;
export type HttpMethod = typeof HTTP_METHODS[number];

export const BODY_TYPES = ["none", "form-data", "x-www-form-urlencoded", "raw", "binary", "graphql"] as const;
export type BodyType = typeof BODY_TYPES[number];

export const AUTH_TYPES = ["none", "bearer", "basic", "apiKey", "oauth2", "aws"] as const;
export type AuthType = typeof AUTH_TYPES[number];

export type GeneratorType = 'sequence' | 'random' | 'date' | 'uuid' | 'nullify';

export const DEFAULT_ORIGIN = 'http://localhost:3000';
