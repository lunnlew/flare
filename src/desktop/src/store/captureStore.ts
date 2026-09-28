import { create } from 'zustand';
import type { CapturedRequest } from '../types/capture';

const MAX_CAPTURED_REQUESTS = 30;

interface CaptureStore {
  capturedRequests: CapturedRequest[];
  connectedClients: number;
  addCapturedRequest: (request: CapturedRequest) => void;
  clearCapturedRequests: () => void;
  setConnectedClients: (count: number) => void;
}

export const useCaptureStore = create<CaptureStore>((set) => ({
  capturedRequests: [],
  connectedClients: 0,
  addCapturedRequest: (request) =>
    set((state) => ({
      capturedRequests: [request, ...state.capturedRequests].slice(0, MAX_CAPTURED_REQUESTS)
    })),
  clearCapturedRequests: () => set({ capturedRequests: [] }),
  setConnectedClients: (count) => set({ connectedClients: count }),
}));