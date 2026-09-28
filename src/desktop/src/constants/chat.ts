export const CHAT_COMMANDS = [
  { cmd: "/search", descKey: "chat.cmdSearch", example: "/search user authentication" },
  { cmd: "/list", descKey: "chat.cmdList", example: "/list" },
  { cmd: "/run", descKey: "chat.cmdRun", example: "/run GET /users" },
  { cmd: "/help", descKey: "chat.cmdHelp", example: "/help" },
] as const;

export const QUICK_COMMANDS = CHAT_COMMANDS.map(c => ({ cmd: c.cmd, descKey: c.descKey }));
