/**
 * Chat Store - AI chat messages and state (NOT PERSISTED)
 *
 * Key Patterns:
 * 1. NOT persisted - chat state is session only
 * 2. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { getApis, searchApis, getAgentContext, executeAgentCommandStream } from '../services/api';
import type { Message } from '../types/chat';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  showHelp: boolean;
  error: string | null;
  // Chat input state
  chatInput: string;
}

interface ChatActions {
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setError: (error: string | null) => void;
  setChatInput: (input: string) => void;
  // API interaction actions
  searchApis: (query: string) => Promise<string[]>;
  listApis: () => Promise<string[]>;
  sendToAgent: (userInput: string, selectedApi?: string, selectedEndpoint?: string) => Promise<string>;
  executeCommand: (input: string) => Promise<string>;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()((set, get) => ({
  messages: [],
  isLoading: false,
  showHelp: false,
  error: null,
  chatInput: '',

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [], error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setShowHelp: (showHelp) => set({ showHelp }),
  setError: (error) => set({ error }),
  setChatInput: (chatInput) => set({ chatInput }),

  searchApis: async (query: string) => {
    try {
      const results = await searchApis(query);
      return results;
    } catch (e) {
      set({ error: '搜索API失败' });
      return [];
    }
  },

  listApis: async () => {
    try {
      const apiInfos = await getApis();
      return apiInfos.map((info) => info.name);
    } catch (e) {
      set({ error: '获取API列表失败' });
      return [];
    }
  },

  sendToAgent: async (userInput: string, selectedApi?: string, selectedEndpoint?: string) => {
    set({ isLoading: true, error: null });

    const streamingMsgId = (Date.now() + 1).toString();
    const streamingMsg: Message = {
      id: streamingMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    set((state) => ({ messages: [...state.messages, streamingMsg] }));

    try {
      const agentContext = await getAgentContext(selectedApi, selectedEndpoint);

      const agentPrompt = `User input: ${userInput}

Available APIs:
${agentContext}

You are an API assistant. Help the user with their API-related requests.
Commands:
- /search <query> - Search APIs
- /list - List all APIs
- /run <METHOD> <path> - Execute a request
- /help - Show help

Be helpful and concise.`;

      await executeAgentCommandStream(agentPrompt, agentContext, (chunk: string) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === streamingMsgId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ),
        }));
      });

      const finalContent = get().messages.find((m) => m.id === streamingMsgId)?.content || "";
      return finalContent;
    } catch (e) {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== streamingMsgId),
      }));
      return get().executeCommand(userInput);
    } finally {
      set({ isLoading: false });
    }
  },

  executeCommand: async (input: string) => {
    const trimmed = input.trim();

    if (trimmed.startsWith("/")) {
      const [cmd, ...args] = trimmed.split(" ");
      const argStr = args.join(" ");

      switch (cmd) {
        case "/search": {
          const results = await get().searchApis(argStr);
          if (results.length === 0) {
            return `No APIs found matching "${argStr}".`;
          }
          return `Found ${results.length} APIs:\n${results.map((name) => `  - ${name}`).join("\n")}`;
        }

        case "/list": {
          const apiNames = await get().listApis();
          if (apiNames.length === 0) {
            return "No APIs loaded. Import an API first.";
          }
          return `Available APIs (${apiNames.length}):\n${apiNames.map((name) => `  - ${name}`).join("\n")}`;
        }

        case "/run": {
          const [method, ...pathParts] = args;
          if (!method || !pathParts.length) {
            return "Usage: /run <METHOD> <path>\nExample: /run GET /users";
          }
          return `To execute: ${method.toUpperCase()} ${pathParts.join(" ")}\n\nUse the Request Builder to send this request.`;
        }

        case "/help": {
          return `Available commands:
  /search <query> - Search APIs
  /list - List all APIs
  /run <METHOD> <path> - Execute a request
  /help - Show help

Also supported:
- Natural language requests like "search for user APIs"
- "call the GET /users endpoint"
- Ask me anything about the loaded APIs!`;
        }

        default:
          return `Unknown command: ${cmd}\n\nTry /help for available commands.`;
      }
    }

    const lowerInput = trimmed.toLowerCase();

    if (lowerInput.includes("搜索") || lowerInput.includes("search")) {
      const query = trimmed.replace(/搜索|search/gi, "").trim();
      const results = await get().searchApis(query);
      return `Search results for "${query}":\n${results.length > 0 ? results.map((name) => `  - ${name}`).join("\n") : "No results found."}`;
    }

    if (lowerInput.includes("列出") || lowerInput.includes("列表") || lowerInput.includes("list")) {
      const apiNames = await get().listApis();
      return `Available APIs (${apiNames.length}):\n${apiNames.map((name) => `  - ${name}`).join("\n")}`;
    }

    if (lowerInput.includes("调用") || lowerInput.includes("执行") || lowerInput.includes("call") || lowerInput.includes("run")) {
      return `To execute an API request, please use the Request Builder tab or type /run <METHOD> <path>\n\nExample: /run GET /users`;
    }

    return `I can help you with:
  - Searching APIs: /search <query>
  - Listing APIs: /list
  - Running requests: /run GET /path
  - General questions about APIs

Or just ask me naturally!`;
  },
}));

// Convenience selector for chat state
export const useChatState = () => useChatStore(
  useShallow((s) => ({
    messages: s.messages,
    isLoading: s.isLoading,
    showHelp: s.showHelp,
    error: s.error,
    chatInput: s.chatInput,
  }))
);