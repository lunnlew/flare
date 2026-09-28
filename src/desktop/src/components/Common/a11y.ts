/**
 * a11y - Accessibility utilities and constants
 *
 * Provides standardized aria labels, roles, and helper functions
 * for accessibility (a11y) compliance.
 */

// ============================================================================
// ARIA Labels
// ============================================================================

export const AriaLabel = {
  // Actions
  send: "发送请求",
  cancel: "取消",
  save: "保存",
  delete: "删除",
  edit: "编辑",
  close: "关闭",
  confirm: "确认",
  add: "添加",
  reset: "重置",
  search: "搜索",
  copy: "复制",
  paste: "粘贴",

  // Request Builder
  urlInput: "请求 URL",
  methodSelect: "请求方法",
  paramsTab: "查询参数",
  headersTab: "请求头",
  bodyTab: "请求体",
  authTab: "认证",

  // Flow Canvas
  canvas: "流程画布",
  toolbar: "工具栏",
  nodeConfig: "节点配置",
  runFlow: "运行流程",
  stopFlow: "停止流程",
  pauseFlow: "暂停流程",
  stepMode: "步进模式",
  addNode: "添加节点",
  deleteNode: "删除节点",

  // Tabs
  tabList: "标签页列表",
  tab: "标签页",

  // Panels
  sidebar: "侧边栏",
  response: "响应面板",
  collection: "集合",

  // Dialogs
  dialog: "对话框",
  modal: "模态框",
  alert: "警告",
  confirmDialog: "确认对话框",

  // Status
  loading: "加载中",
  success: "成功",
  error: "错误",
  warning: "警告",

  // Misc
  menu: "菜单",
  menuItem: "菜单项",
  dropdown: "下拉菜单",
  toggle: "切换",
  checkbox: "复选框",
  tooltip: "提示",
} as const;

// ============================================================================
// ARIA Roles
// ============================================================================

export const Role = {
  main: "main",
  dialog: "dialog",
  alertdialog: "alertdialog",
  status: "status",
  alert: "alert",
  menu: "menu",
  menuitem: "menuitem",
  toolbar: "toolbar",
  application: "application",
  form: "form",
  button: "button",
  link: "link",
  checkbox: "checkbox",
  radio: "radio",
  listbox: "listbox",
  option: "option",
  grid: "grid",
  row: "row",
  cell: "cell",
} as const;

// ============================================================================
// State Attributes
// ============================================================================

export const AriaState = {
  expanded: "aria-expanded",
  pressed: "aria-pressed",
  selected: "aria-selected",
  checked: "aria-checked",
  disabled: "aria-disabled",
  hidden: "aria-hidden",
  live: "aria-live",
  atomic: "aria-atomic",
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique id for a11y associations (e.g., aria-labelledby)
 */
export function a11yId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get aria-label with fallback to content text
 */
export function getAriaLabel(label: string | undefined, fallback: string): string {
  return label || fallback;
}

/**
 * Check if keyboard event is activation (Enter or Space)
 */
export function isActivationKey(e: React.KeyboardEvent): boolean {
  return e.key === "Enter" || e.key === " ";
}

/**
 * Handle keyboard activation for interactive elements
 */
export function handleActivation(
  e: React.KeyboardEvent,
  onActivate: () => void
): void {
  if (isActivationKey(e)) {
    e.preventDefault();
    onActivate();
  }
}

/**
 * Trap focus within a container (for modals/dialogs)
 * Returns a cleanup function to remove the event listener
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  container.addEventListener("keydown", handleTab);
  first?.focus();

  return () => container.removeEventListener("keydown", handleTab);
}
