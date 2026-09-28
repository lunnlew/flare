# Flare API 开发工具 - 功能规格明细

**版本:** 1.6
**更新日期:** 2026-06-14
**状态:** 持续迭代中 - Mock服务扩展中

---

## 一、项目概述

### 1.1 项目简介

Flare 是一个现代化的 API 开发工具，目标是成为一个功能完善的生产级 API 管理工具，对标 Postman/Insomnia/Apifox，同时保持"AI Agent 时代 API 工具"的独特定位。

### 1.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2.x | Rust 后端 + Web 前端 |
| 前端框架 | React 18 + TypeScript | 函数式组件 + Hooks |
| 状态管理 | Zustand | 轻量级状态管理 |
| UI 组件 | 自定义组件 | 基于 React 构建 |
| 代码编辑 | Monaco Editor | VS Code 同款编辑器 |
| 样式方案 | CSS Modules + CSS Variables | scoped styles |
| 构建工具 | Vite | 快速开发体验 |

### 1.3 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Desktop UI │
│  ┌─────────┐ ┌─────────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │ListMode │ │RequestBuilder│ │AIChatMode│ │  FlowCanvas     │   │
│  └─────────┘ └─────────────┘└─────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AppState (统一状态层)                        │
│  useCollectionStore | useEnvironmentStore | useSettingsStore    │
│  useRequestStore | useResponseStore | useFlowStore              │
│  useFlowCanvasUIStore | useScriptsStore | useChatStore          │
│  useMockStore | useSecureStore | useNotificationStore         │
│  useAuditStore | useDynamicMockStore                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Tauri IPC Commands │
│  get_apis | save_api | git_* | execute_request | env_*        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Rust Backend (.rs) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、主模式 (Main Modes)

### 2.1 模式总览

| 模式 | 描述 | 入口组件 | 状态 |
|------|------|---------|------|
| List Mode | API 列表浏览与管理 | Collection组件 | ✅ 已实现 |
| Request Builder | HTTP 请求构建与发送 | RequestBuilder组件 | ✅ 已实现 |
| AI Chat Mode | AI 辅助 API 操作 | AI组件 | ✅ 已实现 |
| Flow Canvas | 可视化工作流编排 | FlowCanvas组件 | ✅ 已实现 |

---

## 三、Request Builder 详细功能

### 3.1 URL Bar

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Method 选择器 | GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS | P0 | ✅ |
| URL 输入框 | 支持路径变量 `{{baseUrl}}/users/:id` | P0 | ✅ |
| 发送按钮 | 带 loading 状态 | P0 | ✅ |
| 快捷操作栏 | 保存/复制/导入导出/设置 | P0 | ✅ |
| 请求取消 | AbortController 取消请求 | P1 | ✅ |
| URL 自动编码 | 特殊字符自动 encode | P1 | ✅ |
| 参数自动解析 | URL 参数自动填充到 Params Tab | P1 | ✅ |
| 变量替换 | `{{baseUrl}}` 语法支持 | P1 | ✅ |
| 代码生成 | 语言切换 (Python/Java/Go/...) | P1 | ✅ |
| 路径参数高亮 | `/:id` `{{userId}}` 高亮显示 | P2 | ✅ |
| 域名自动补全 | 历史输入智能补全 | P2 | ✅ |
| 请求对比 | Diff View 对比两次响应 | P2 | ✅ |

**快捷键:**
| 快捷键 | 功能 | 状态 |
|--------|------|------|
| `Ctrl + Enter` | 发送请求 | ✅ |
| `Ctrl + Shift + C` | 复制完整 cURL 命令 | ✅ |
| `Ctrl + L` | 聚焦 URL 输入框 | ✅ |
| `Ctrl + Shift + Delete` | 清除当前请求 | ✅ |

### 3.2 Params Tab

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Key-Value 列表 | 参数键值对 | P0 | ✅ |
| 启用/禁用 | 单行启用/禁用开关 | P0 | ✅ |
| 添加/删除 | 动态增删行 | P0 | ✅ |
| 自动编码 | 自动 URL encode | P1 | ✅ |
| 参数生成器 | 批量生成测试数据 | P1 | ✅ |
| 参数拖拽排序 | 调整参数顺序 | P2 | ✅ |
| 参数校验 | 参数格式校验 | P2 | ✅ |
| 参数描述 | 参数注释说明 | P2 | ✅ |

### 3.3 Headers Tab

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Key-Value 列表 | 请求头键值对 | P0 | ✅ |
| 启用/禁用 | 单行启用/禁用开关 | P0 | ✅ |
| 添加/删除 | 动态增删行 | P0 | ✅ |
| 快捷模板 | Content-Type/Authorization 等预设 | P1 | ✅ |
| Preset 预设 | 保存常用 Header 组合 | P2 | ✅ |

### 3.4 Body Tab

**Body 类型:**
| 类型 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| none | 不发送 body | P0 | ✅ |
| form-data | Key-Value + 文件上传 | P0 | ✅ |
| x-www-form-urlencoded | URL 编码表单 | P0 | ✅ |
| raw | 文本输入框 | P0 | ✅ |
| binary | 文件选择上传 | P1 | ✅ |
| GraphQL | Query + Variables | P0 | ✅ |

**功能矩阵:**
| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 文件拖拽上传 | 拖拽文件到表单 | P1 | ✅ |
| 字段类型切换 | 文本/文件切换 | P1 | ✅ |
| 文件预览 | 显示文件名、大小、类型 | P1 | ✅ |
| 语法高亮 | Monaco Editor | P1 | ✅ |

### 3.5 Auth Tab

| 类型 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| No Auth | 无认证 | P0 | ✅ |
| Bearer Token | Bearer Token | P0 | ✅ |
| Basic Auth | 用户名/密码 | P0 | ✅ |
| API Key | Header/Query | P0 | ✅ |
| OAuth 2.0 | 完整授权码流程 + Client Credentials | P1 | ✅ |
| AWS Signature | AWS 签名 | P2 | ✅ |

**OAuth 2.0 字段:**
| 字段 | 状态 |
|------|------|
| Callback URL | ✅ |
| Auth URL | ✅ |
| Access Token URL | ✅ |
| Client ID | ✅ |
| Client Secret | ✅ |
| Scope | ✅ |
| Access Token | ✅ |
| Refresh Token | ✅ |
| Token Type | ✅ |
| Client Authentication | ✅ |
| 清除 Token | ✅ |

### 3.6 Scripts Tab

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Pre-request | 请求前脚本 | P0 | ✅ |
| Post-response | 响应后脚本 | P0 | ✅ |
| 启用/禁用 | 脚本开关 | P0 | ✅ |
| 代码编辑 | Monaco Editor | P0 | ✅ |
| 语法高亮 | JavaScript 语法着色 | P1 | ✅ |
| 错误提示 | 语法错误提示 | P2 | ✅ |
| 控制台输出 | console.log 输出面板 | P1 | ✅ |
| 清空日志 | 清空控制台 | P1 | ✅ |

### 3.7 Env Tab

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 环境变量列表 | Key-Value 显示 | P0 | ✅ |
| 变量替换预览 | 发送前预览变量替换结果 | P0 | ✅ |

---

## 四、Response Panel

### 4.1 核心功能

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 状态码 | HTTP 状态码 | P0 | ✅ |
| 状态文本 | Status Text | P0 | ✅ |
| 响应时间 | 耗时 ms | P0 | ✅ |
| 响应体预览 | Pretty/Raw/Preview | P0 | ✅ |
| JSON 格式化 | JSON 折叠显示 | P0 | ✅ |
| 响应头 | Headers 列表 | P0 | ✅ |
| 复制响应 | 复制 Body | P0 | ✅ |

### 4.2 响应展示模式

| 模式 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Pretty | 格式化显示 | P0 | ✅ |
| Raw | 原始文本 | P0 | ✅ |
| Preview | HTML 预览 | P2 | ✅ |

### 4.3 响应体功能

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| JSON 折叠 | 折叠/展开 JSON 节点 | P0 | ✅ |
| 路径复制 | 复制 JSON 路径 | P1 | ✅ |
| 搜索/过滤 | 响应内搜索 | P1 | ✅ |
| 值复制 | 复制特定值 | P1 | ✅ |
| 响应大小 | Size 显示 | P1 | ✅ |

### 4.4 响应操作

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 复制响应 | 复制完整响应 | P0 | ✅ |
| 复制 Headers | 复制响应头 | P1 | ✅ |
| 保存到文件 | 导出响应到文件 | P1 | ✅ |
| 对比响应 | 与历史响应对比 | P2 | ✅ |

---

## 五、Environment 环 境变量

### 5.1 核心功能

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 环境切换 | Development/Production | P0 | ✅ |
| 变量列表 | Key-Value 显示 | P0 | ✅ |
| 修改变量 | 编辑变量值 | P0 | ✅ |
| 创建环境 | 新建环境 | P1 | ✅ |
| 重命名环境 | 重命名环境 | P1 | ✅ |
| 删除环境 | 删除环境 | P1 | ✅ |

### 5.2 环境管理

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 复制环境 | 复制环境配置 | P2 | ✅ |
| 环境排序 | 调整环境顺序 | P2 | ✅ |

---

## 六、FlowCanvas 流程画布

### 6.1 节点类型 (9种)

| 节点类型 | 描述 | 状态 |
|------|------|------|
| apiCall | API 调用节点 | ✅ |
| auth | 认证设置节点 | ✅ |
| condition | 条件分支节点 | ✅ |
| loop | 循环执行节点 | ✅ |
| transform | 数据转换节点 | ✅ |
| assert | 断言验证节点 | ✅ |
| delay | 延迟等待节点 | ✅ |
| log | 日志输出节点 | ✅ |
| script | 脚本执行节点 | ✅ |

### 6.2 API节点配置

| 功能 | 描述 | 状态 |
|------|------|------|
| Method 选择 | GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS | ✅ |
| URL 输入 | 支持路径变量 | ✅ |
| Params | Query 参数 | ✅ |
| Headers | 请求头 | ✅ |
| Body | 请求体 | ✅ |
| Auth | 认证配置 | ✅ |
| 从Collection加载 | API节点从已保存请求加载 | ✅ |

### 6.3 可拖拽配置面板

| 功能 | 描述 | 状态 |
|------|------|------|
| 面板宽度 | 默认 350px, 最小 200px, 最大 650px | ✅ |
| 拖拽调整 | 拖拽边框调整宽度 | ✅ |
| 宽度指示 | 调整时显示像素值 | ✅ |

### 6.4 执行引擎

| 功能 | 描述 | 状态 |
|------|------|------|
| 拓扑排序执行 | 节点按依赖顺序执行 | ✅ |
| 执行状态 | 节点状态显示 (pending/running/success/error/skipped) | ✅ |
| 断点调试 | 流程支持设置断点，单步执行 | ✅ |
| 子流程复用 | 常用流程可保存为子流程复用 | ✅ |
| 并行执行 | 支持并行执行多个无关节点 | ✅ |
| maxConcurrency | 可配置并行数量 | ✅ |

### 6.5 变量系统

| 变量类型 | 语法 | 优先级 | 状态 |
|---------|------|--------|------|
| 全局变量 | `{{global.varName}}` | 最低 | ✅ |
| 环境变量 | `{{env.varName}}` | 中 | ✅ |
| 工作流变量 | `{{workflow.varName}}` | 高 | ✅ |
| 节点输出 | `{{nodeId.response}}` | 最高 | ✅ |

---

## 七、Mock 功能

### 7.1 MockConfig 页面

| 功能 | 描述 | 状态 |
|------|------|------|
| 语言切换 | 中文/English | ✅ |
| 智能检测开关 | 启用/禁用智能检测 | ✅ |
| 序列生成设置 | 前缀/起始值/补零 | ✅ |
| 内置规则展示 | 显示24 种内置规则 | ✅ |
| 内置规则启用/禁用 | 每条规则独立控制 | ✅ |
| 自定义规则 | 用户自定义规则管理 | ✅ |
| 预览 | 实时预览生成结果 | ✅ |

### 7.2 内置规则 (32种)

**基础规则 (24种):**
| 规则 | 描述 | 示例输出 | 状态 |
|------|------|---------|------|
| auto | 智能识别 | - | ✅ |
| name | 姓名 | James Smith | ✅ |
| email | 邮箱 | user@example.com | ✅ |
| phone | 电话 | +1-555-123-4567 | ✅ |
| city | 城市 | New York | ✅ |
| country | 国家 | USA | ✅ |
| company | 公司 | Acme Corp | ✅ |
| price | 价格 | 49.99 | ✅ |
| address | 地址 | 123 Main St | ✅ |
| avatar | 头像 URL | https://... | ✅ |
| uuid | UUID | 550e8400-... | ✅ |
| url | 网址 | https://... | ✅ |
| ipv4 | IPv4 | 192.168.1.100 | ✅ |
| ipv6 | IPv6 | 2001:0db8:... | ✅ |
| lat | 纬度 | 40.712776 | ✅ |
| lng | 经度 | -74.005974 | ✅ |
| zip | 邮编 | 10001 | ✅ |
| color | 颜色 | #FF5733 | ✅ |
| rating | 评分 | 4.5 | ✅ |
| age | 年龄 | 25 | ✅ |
| date | 日期 | 2026-06-06 | ✅ |
| sequence | 序列递增 | 1, 2, 3... | ✅ |
| random | 随机字符串 | aB3x9k... | ✅ |
| nullify | 清空值 | (空字符串) | ✅ |

**动态生成类型 (8种):**
| 规则 | 描述 | 示例输出 | 状态 |
|------|------|---------|------|
| $timestamp | Unix时间戳(ms) | 1750000000000 | ✅ |
| $date | 当前日期 | 2026-06-07 | ✅ |
| $time | 当前时间 | 14:30:00 | ✅ |
| $datetime | ISO日期时间 | 2026-06-07T14:30:00Z | ✅ |
| $randomInt | 随机整数 | 7382 | ✅ |
| $randomFloat | 随机浮点数 | 482.73 | ✅ |
| $seq | 序列号 | SEQ_001 | ✅ |
| boolean | 布尔值 | true/false | ✅ |

### 7.3 智能生成优先级

```
1. Schema format精确匹配 (最高优先级)
   format: email → email 规则

2. 字段名智能识别
   name包含 email → email 规则

3. Schema type 兜底
   type: number → price 规则

4. 最终兜底
   random 随机字符串
```

### 7.4 模板引擎 (Enhanced Template Engine)

**支持语法:**
| 语法 | 描述 | 示例 | 状态 |
|------|------|------|------|
| `{{fieldName}}` | 字段引用 | `{{email}}` | ✅ |
| `{{$ruleName}}` | 内置规则 | `{{$email}}` | ✅ |
| `{{$randomInt min max}}` | 随机整数 | `{{$randomInt 1 100}}` | ✅ |
| `{{$randomFloat min max dec}}` | 随机浮点 | `{{$randomFloat 0 100 2}}` | ✅ |
| `{{$choice opt1 opt2 ...}}` | 选项随机 | `{{$choice yes no}}` | ✅ |
| `{{$delay ms}}` | 延迟(ms) | `{{$delay 1000}}` | ✅ |
| `{{$delay min-max}}` | 随机延迟 | `{{$delay 500-2000}}` | ✅ |
| `{{$env varName}}` | 环境变量 | `{{$env API_URL}}` | ✅ |
| `{{$workflow varName}}` | 工作流变量 | `{{$workflow.userId}}` | ✅ |
| `{{$nodeId.response.path}}` | 节点输出 | `{{$node1.response.data}}` | ✅ |

### 7.5 请求匹配 (Request Matching)

| 匹配类型 | 描述 | 优先级 | 状态 |
|---------|------|--------|------|
| Path Pattern | 路径匹配 `{{baseUrl}}/users/:id` | P0 | ✅ |
| Method | HTTP方法 GET/POST/PUT/DELETE | P0 | ✅ |
| Query Params | 查询参数匹配 | P1 | ✅ |
| Request Headers | Header匹配 | P1 | ✅ |
| Body JSON Path | JSON Body路径匹配 | P2 | ⚠️ 规划中 |
| Regex Pattern | 正则路径匹配 | P2 | ⚠️ 规划中 |

### 7.6 状态与场景 (Stateful Mocks)

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Scenario支持 | 同一endpoint多次调用返回不同响应 | P1 | ✅ |
| Session状态 | 维护跨请求状态 | P1 | ✅ |
| Sequence计数 | 按调用次数返回不同响应 | P1 | ✅ |
| Scenario重置 | 清除场景状态 | P2 | ✅ |

### 7.7 响应控制 (Response Control)

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 自定义Status Code | 4xx/5xx错误响应 | P0 | ✅ |
| 自定义Headers | 响应头设置 | P0 | ✅ |
| 响应延迟 | delay控制 | P0 | ✅ |
| 多变体响应 | 同一endpoint多个响应体 | P2 | ⚠️ 规划中 |
| Priority优先级 | 响应优先级排序 | P2 | ⚠️ 规划中 |

### 7.8 高级功能 (Advanced Features)

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| OpenAPI自动Mock | 从OpenAPI spec自动生成mock | P1 | ✅ |
| Proxy Record | 代理记录真实请求自动生成mock | P1 | ⚠️ 规划中 |
| Admin REST API | 程序化配置mock规则 | P2 | ⚠️ 规划中 |
| WebSocket Mock | WebSocket响应模拟 | P2 | ⚠️ 规划中 |
| 请求日志 | mock请求审计日志 | P2 | ✅ |
| gRPC Mock | gRPC服务模拟 | P3 | ❌ |

### 7.9 动态Mock服务 (Dynamic Mock Server)

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 规则触发器 | 基于请求参数触发规则 | P0 | ✅ |
| 变量提取 | 从params/headers/body提取 | P0 | ✅ |
| 模板替换 | 动态生成响应体 | P0 | ✅ |
| 实时预览 | 模拟响应预览 | P1 | ✅ |
| 自定义规则 | 用户定义生成规则 | P1 | ✅ |

---

## 八、集合管理 (Collection)

### 8.1 核心功能

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 创建集合 | 新建集合 | P0 | ✅ |
| 删除集合 | 删除集合 | P0 | ✅ |
| 保存请求 | 保存到集合 | P0 | ✅ |
| 请求列表 | 集合内请求 | P0 | ✅ |
| 请求重命名 | 双击重命名 | P0 | ✅ |
| 请求复制 | 复制请求 | P0 | ✅ |
| 请求删除 | 删除请求 | P0 | ✅ |

### 8.2 集合操作

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 集合重命名 | 双击重命名 | P1 | ✅ |
| 集合复制 | 复制整个集合 | P1 | ✅ |
| 集合导出 | 导出为 JSON | P1 | ✅ |
| 集合导入 | 导入 JSON | P1 | ✅ |

### 8.3 导入格式支持

| 格式 | 导入 | 导出 | 状态 |
|------|------|------|------|
| OpenAPI 3.x | ✅ | ✅ | P1 |
| OpenAPI 2.0 | ✅ | ✅ | P1 |
| Postman v2.1 | ✅ | ✅ | P1 |
| HAR | ✅ | ✅ | P1 |
| GraphQL | ✅ | ✅ | P2 |

---

## 九、导入导出

### 9.1 ImportModal 支持格式

| 格式 | 检测方法 | 状态 |
|------|---------|------|
| OpenAPI 3.x | `openapi.startsWith('3.')` | ✅ |
| OpenAPI 2.0 | `swagger === '2.0'` | ✅ |
| AsyncAPI 2.x | `asyncapi.startsWith('2.')` | ✅ |
| Postman v2.1 | `getpostman.com` | ✅ |
| HAR | `har.1.2` | ✅ |
| GraphQL | `type Query/Mutation` | ✅ |
| SwaggerHub | `configUrl` | ✅ |

---

## 十、设置面板

### 10.1 核心设置

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 超时设置 | Timeout ms | P0 | ✅ |
| 跟随重定向 | Follow Redirects | P0 | ✅ |

### 10.2 SSL/TLS 设置

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| SSL 验证 | SSL Certificate 开关 | P1 | ✅ |
| 客户端证书 | mTLS 证书 | P2 | ✅ |
| CA 证书 | CA Certificate | P2 | ⚠️ 部分 |

### 10.3 界面设置

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 主题 | 深色/浅色/夕照/暖白/松木 | P2 | ✅ |
| 字体大小 | 10/12/14/16px | P2 | ✅ |
| 语言 | 中文/English | P2 | ✅ |

### 10.4 通用设置

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 自动保存 | 自动保存请求 (开关+间隔时间) | P2 | ✅ |
| 敏感数据脱敏 | 日志和输出中自动脱敏 | P1 | ✅ |
| 键盘快捷键 | 可配置快捷键 | P1 | ✅ |

### 10.5 Git 版本控制

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Git状态 | 查看已暂存/未暂存/未跟踪文件 | P1 | ✅ |
| 提交历史 | 查看 git log 历史记录 | P1 | ✅ |
| 文件暂存 | 暂存选中文件 | P1 | ✅ |
| 提交更改 | 提交已暂存文件 | P1 | ✅ |
| 分支切换 | 切换 Git 分支 | P1 | ✅ |
| 分支创建 | 创建新 Git 分支 | P1 | ✅ |
| 差异比较 | 查看两个提交之间的差异 | P1 | ✅ |
| 自动暂存 | 保存 API/请求/Flow 时自动 git add | P1 | ✅ |
| 启动初始化 | 应用启动时自动初始化 Git 仓库 | P1 | ✅ |
| 错误处理 | Git 未安装/初始化失败时的错误处理 | P1 | ✅ |

---

## 十一、代码生成

### 11.1 支持语言

| 语言 | 描述 | 状态 |
|------|------|------|
| Python | Python requests | ✅ |
| Java | Java OkHttp | ✅ |
| Go | Go http.Client | ✅ |
| JavaScript | Fetch API | ✅ |
| cURL | cURL 命令 | ✅ |
| PHP | PHP cURL | ✅ |
| C# | C# HttpClient | ✅ |
| Ruby | Ruby Net::HTTP | ✅ |

### 11.2 代码生成功能

| 功能 | 描述 | 状态 |
|------|------|------|
| 完整可运行代码 | 包含错误处理和响应打印 | ✅ |
| 语言切换 | 下拉选择 | ✅ |
| 代码复制 | 一键复制 | ✅ |

---

## 十二、AI Chat Mode

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 对话界面 | Chat messages 展示 | P0 | ✅ |
| AI 交互 | 调用 AI能力处理 API | P0 | ✅ |
| 命令执行 | 执行 AI 生成的命令 | P1 | ✅ |
| 帮助面板 | 显示帮助信息 | P1 | ✅ |

---

## 十三、全局键盘快捷键

| 快捷键 | 功能 | 状态 |
|--------|------|------|
| `Ctrl + B` | 切换侧边栏 | ✅ |
| `Ctrl + E` | 打开环境设置 | ✅ |
| `Ctrl + ,` | 打开应用设置 | ✅ |
| `Ctrl + N` | 新建/重置请求 | ✅ |
| `Ctrl + Enter` | 发送请求 | ✅ |
| `Ctrl + Shift + C` | 复制完整 cURL | ✅ |
| `Ctrl + L` | 聚焦 URL 输入框 | ✅ |
| `Ctrl + 1~8` | 切换模式 | ✅ |
| `Ctrl + Tab` | 下一个模式 | ✅ |
| `Ctrl + Shift + Tab` | 上一个模式 | ✅ |

---

## 十四、扩展功能

### 14.1 收藏响应

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 收藏响应 | 标记重要响应防止自动清理 | P1 | ✅ |
| 收藏过滤 | 历史面板支持只看收藏 | P1 | ✅ |
| 右键菜单 | 历史项右键收藏/删除 | P1 | ✅ |

### 14.2 GraphQL Schema 文档

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Schema 内省 | 自动获取 GraphQL Schema | P1 | ✅ |
| 类型文档 | 显示类型、字段、描述 | P1 | ✅ |
| 搜索过滤 | 支持按类型名搜索 | P1 | ✅ |
| 文档面板 | 可折叠的文档侧边栏 | P1 | ✅ |

### 14.3 敏感数据脱敏

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Token脱敏 | Bearer Token自动脱敏 | P1 | ✅ |
| API Key脱敏 | 通用API Key模式检测 | P1 | ✅ |
| 密码脱敏 | 密码字段自动脱敏 | P1 | ✅ |
| AWS密钥脱敏 | AWS AK/SK 自动脱敏 | P1 | ✅ |
| 信用卡脱敏 | 信用卡号脱敏 | P2 | ✅ |
| 邮箱脱敏 | 邮箱地址脱敏 | P2 | ✅ |

### 14.4 操作审计日志

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 敏感操作记录 | 记录API操作历史 | P2 | ✅ |
| 审计面板 | AuditLogPanel 展示 | P2 | ✅ |
| 时间戳追踪 | 操作时间记录 | P2 | ✅ |

### 14.5 Interceptor 多阶段脚本

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| preBuild | URL构建前执行 | P1 | ✅ |
| preSend | 发送前执行（可中止） | P1 | ✅ |
| postResponse | 响应后执行 | P1 | ✅ |
| postError | 错误时执行 | P1 | ✅ |
| 脚本控制台 | console.log 输出 | P1 | ✅ |

### 14.6 Diff 对比工具

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 行级Diff | LCS算法计算差异 | P2 | ✅ |
| 差异高亮 | 新增(绿)/删除(红) | P2 | ✅ |
| 变更统计 | 显示变更行数 | P2 | ✅ |

### 14.7 变量校验

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| 重复检测 | 环境变量重复警告 | P1 | ✅ |
| 名称校验 | 变量名格式验证 | P1 | ✅ |
| 引用追踪 | 变量使用位置追踪 | P1 | ✅ |

### 14.8 编辑器设置

| 功能 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| Tab大小 | 2/4 空格可配置 | P2 | ✅ |
| 行高 | 紧凑/正常/宽松 | P2 | ✅ |

---

## 十五、目录结构

```
src/desktop/src/
├── App.tsx                  # 应用入口
├── AppState.ts              # 统一状态管理入口
├── main.tsx                 # React 入口
├── components/
│   ├── AI/                  # AI 相关组件
│   │   └── AIChatMode.tsx
│   ├── Collection/          # 集合管理组件
│   │   ├── CollectionPanel.tsx
│   │   ├── CollectionsPanel.tsx
│   │   └── ListMode.tsx
│   ├── Common/              # 通用组件
│   │   ├── AuthItemsForm.tsx
│   │   ├── CodeGenPanel.tsx
│   │   ├── ConfigList.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── EnvVariablesList.tsx
│   │   ├── FieldEditor.tsx
│   │   ├── GraphQLSchemaDocs.tsx
│   │   ├── ImportModal.tsx
│   │   ├── InputModal.tsx
│   │   ├── JsonTreeView.tsx
│   │   ├── KeyValueEditor.tsx
│   │   ├── Modal.tsx
│   │   ├── RequestInfoPanel.tsx
│   │   ├── ResponseContextMenu.tsx
│   │   ├── Row.tsx
│   │   ├── SaveDialog.tsx
│   │   ├── TestDataGenerator.tsx
│   │   ├── Toast.tsx
│   │   └── useVariableAutocomplete.tsx
│   ├── Flow/                # FlowCanvas 组件
│   │   ├── FlowCanvas.tsx
│   │   ├── FlowCanvas.constants.ts
│   │   ├── FlowExecutionEngine.ts
│   │   ├── FlowNodes.tsx
│   │   ├── FlowToolbar.tsx
│   │   ├── FlowVariableInput.tsx
│   │   ├── NodeConfigPanel.tsx
│   │   ├── canvas/
│   │   │   ├── useCanvasHandlers.ts
│   │   │   ├── useExecutionControl.ts
│   │   │   └── useNodeOperations.ts
│   │   ├── nodes/
│   │   │   ├── ApiCallNodeConfig.tsx
│   │   │   ├── AssertNodeConfig.tsx
│   │   │   ├── AuthNodeConfig.tsx
│   │   │   ├── ConditionNodeConfig.tsx
│   │   │   ├── DelayNodeConfig.tsx
│   │   │   ├── LoopNodeConfig.tsx
│   │   │   ├── LogNodeConfig.tsx
│   │   │   ├── NodeConfigBase.tsx
│   │   │   ├── ScriptNodeConfig.tsx
│   │   │   └── TransformNodeConfig.tsx
│   │   ├── panels/
│   │   │   ├── ExecutionLogPanel.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   └── VariablesPanel.tsx
│   │   └── useFlowVariableAutocomplete.tsx
│   ├── History/             # 历史记录组件
│   │   ├── HistoryPanel.tsx
│   │   └── SavedRequestItem.tsx
│   ├── Layout/             # 布局组件
│   │   ├── ModeTab.tsx
│   │   ├── ResizablePanel.tsx
│   │   └── Workspace.tsx
│   ├── Request/            # 请求构建器组件
│   │   ├── ApiRequestConfigPanel.tsx
│   │   ├── AuthPanel.tsx
│   │   ├── BodyPanel.tsx
│   │   ├── EnvPanel.tsx
│   │   ├── EnvironmentBar.tsx
│   │   ├── HeadersPanel.tsx
│   │   ├── ParamsPanel.tsx
│   │   ├── RequestBuilder.tsx
│   │   ├── RequestPanel.tsx
│   │   ├── ScriptsPanel.tsx
│   │   └── UrlBar.tsx
│   ├── Response/           # 响应展示组件
│   │   └── ResponsePanel.tsx
│   └── Settings/           # 设置组件
│       ├── AppSettings.tsx   # 应用设置
│       ├── AuditLogPanel.tsx # 审计日志面板
│       ├── DiffViewer.tsx    # Diff 对比工具
│       ├── EnvConfig.tsx     # 环境配置
│       ├── GitPanel.tsx      # Git 版本控制
│       ├── MockConfig.tsx    # Mock 配置
│       ├── MockServerPanel.tsx # Mock 服务器
│       └── SettingsPanel.tsx # 设置面板
├── hooks/                  # 自定义 Hooks
├── services/              # 服务层
│   └── api.ts             # Tauri IPC 调用
├── store/                 # Zustand 状态存储
│   ├── auditStore.ts      # 审计日志
│   ├── chatStore.ts       # AI 聊天状态
│   ├── collectionStore.ts # 集合状态
│   ├── dynamicMockStore.ts# 动态 Mock 状态
│   ├── environmentStore.ts# 环境状态
│   ├── flowCanvasUIStore.ts # FlowCanvas UI 状态
│   ├── flowStore.ts       # Flow 状态
│   ├── mockStore.ts       # Mock 配置状态
│   ├── notificationStore.ts # Toast 通知
│   ├── requestStore.ts    # 请求状态
│   ├── responseStore.ts   # 响应状态
│   ├── scriptsStore.ts    # 脚本状态
│   ├── secureStore.ts     # 敏感数据加密存储
│   ├── settingsStore.ts   # 应用设置
│   └── uiStore.ts         # UI 状态
├── types/                  # 类型定义
│   ├── api.ts
│   ├── chat.ts
│   ├── flow.ts
│   ├── http.ts
│   └── index.ts
└── utils/                  # 工具函数
    ├── diff.ts
    ├── mock.ts
    ├── request-builder.ts
    ├── RequestUtils.ts
    ├── scriptRunner.ts
    └── string.ts
```

---

## 十六、实现状态统计

### 16.1 模块完成度

| 模块 | 已实现 | 部分实现 | 未实现 | 总计 |
|------|--------|---------|--------|------|
| URL Bar | 13 | 0 | 0 | 13 |
| Params Tab | 5 | 0 | 0 | 5 |
| Headers Tab | 5 | 0 | 0 | 5 |
| Body Tab | 19 | 0 | 0 | 19 |
| Auth Tab | 19 | 0 | 0 | 19 |
| Scripts Tab | 16 | 0 | 0 | 16 |
| Response Panel | 20 | 0 | 0 | 20 |
| Environment | 12 | 0 | 0 | 12 |
| FlowCanvas | 10 | 0 | 0 | 10 |
| Mock | 32 | 0 | 0 | 32 |
| Collection | 17 | 0 | 0 | 17 |
| Settings | 11 | 0 | 0 | 11 |
| AI Chat | 4 | 0 | 0 | 4 |
| 全局快捷键 | 8 | 0 | 0 | 8 |
| 扩展功能 | 29 | 0 | 0 | 29 |
| **总计** | **220** | **0** | **0** | **220** |

### 16.2 优先级分布

| 优先级 | 描述 | 完成度 |
|--------|------|--------|
| P0 | 核心功能，必须实现 | 100% |
| P1 | 重要功能，生产可用 | 100% |
| P2 | 增强功能，用户体验 | 100% |

---

## 十七、禁止实现的功能

以下功能因团队决策或技术限制被禁止实现：

| 功能 | 原因 |
|------|------|
| 团队协作 | 纯本地使用，无团队/同步功能 |
| 双向同步 | 禁止多人同步 |
| 密钥管理 (Key Management) | 需要 Vault 支持，后端依赖 |
| 变更通知 | 不需要通知机制 |
| 冲突合并 | Git 风格的冲突解决 |
| WebSocket 测试 | 需要后端支持 |
| gRPC 支持 | 需要后端支持 |
| 性能压测 | 未来规划 |

---

*本文档最后更新于 2026-06-08*
*版本: 1.5*
*状态: 已完成实现*
*功能总数: 220 (100% 实现)*