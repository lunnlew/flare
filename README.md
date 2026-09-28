# Flare API 开发工具

**版本:** 1.6  
**更新日期:** 2026-06-14  
**状态:** 持续迭代中

---

## 项目概览

<!-- TODO: 截图待添加 -->
![概览截图](docs/assets/images/overview.png)

---

## 目录

- [第一章：项目概览](#第一章项目概览)
- [第二章：功能特性](#第二章功能特性)
- [第三章：快速开始](#第三章快速开始)
- [第四章：安装配置](#第四章安装配置)
- [第五章：CLI 参考](#第五章cli-参考)
- [第六章：桌面应用](#第六章桌面应用)
- [第七章：API 格式支持](#第七章api-格式支持)
- [第八章：Mock 服务器](#第八章mock-服务器)
- [第九章：MCP 集成](#第九章mcp-集成)
- [第十章：浏览器扩展](#第十章浏览器扩展)
- [第十一章：开发指南](#第十一章开发指南)
- [第十二章：常见问题](#第十二章常见问题)
- [第十三章：更新日志](#第十三章更新日志)
- [第十四章：许可证](#第十四章许可证)

---

## 第一章：项目概览

### 1.1 什么是 Flare

Flare 是一个现代化的 API 开发工具，目标是成为一个功能完善的生产级 API 管理工具，对标 Postman/Insomnia/Apifox，同时保持"AI Agent 时代 API 工具"的独特定位。

**核心能力：** 将各种 API 定义格式（OpenAPI、AsyncAPI、GraphQL、Postman、HAR）解析为统一的中间表示（IR），让人和 AI Agent 都能统一地访问和操作 API。

### 1.2 核心价值定位

**解决什么问题：**
- API 格式碎片化导致 Agent 和人类难以统一访问 API
- 不同格式需要分别处理，没有统一中间层

**解决方案：**
- 通过统一的 IR 格式，在应用层建立工具优势
- 让人类通过桌面/CLI/Web/Chat 高效搜索和测试 API
- 让 Agent 通过 MCP/Skill/CLI/Agent 准确理解和执行 API 任务

### 1.3 与传统工具的区别

| 特性 | Flare | Postman | Insomnia | Apifox |
|------|-------|---------|----------|--------|
| AI Agent 原生支持 | ✅ MCP Server | ❌ | ❌ | ❌ |
| 多格式统一 IR | ✅ 6 种格式 | ❌ | ❌ | ❌ |
| 语义搜索 | ✅ Embedding | ❌ | ❌ | ❌ |
| Git 版本控制 | ✅ 原生集成 | ❌ | ❌ | ❌ |
| FlowCanvas 可视化 | ✅ 9 种节点 | ❌ | ❌ | ❌ |
| 浏览器扩展 | ✅ | ❌ | ❌ | ❌ |

### 1.4 适用场景

- **API 开发和测试**：构建、测试、调试 API 请求
- **团队协作**：共享 API 集合，统一管理
- **AI Agent 集成**：为 AI Agent 提供标准化的 API 操作接口
- **文档生成**：从 API 定义自动生成文档
- **Mock 服务**：基于 API 定义快速搭建 Mock 服务器

### 1.5 目标用户

**主要用户（人类）：**
- API 开发者
- 测试工程师
- 使用 Desktop/CLI/Web/Chat 进行 API 搜索、测试、文档管理

**次要用户（Agent）：**
- AI Agent
- 通过 MCP/Skill/CLI/Agent 连接获取 API 能力

---

## 第二章：功能特性

### 2.1 多格式 API 解析

支持 6 种主流 API 格式的统一解析：

| 格式 | 版本 | 状态 |
|------|------|------|
| OpenAPI | 3.x | ✅ 已实现 |
| Swagger | 2.0 | ✅ 已实现 |
| AsyncAPI | 2.x | ✅ 已实现 |
| GraphQL | - | ✅ 已实现 |
| Postman Collection | v2.1 | ✅ 已实现 |
| HAR | 1.2 | ✅ 已实现 |
| Raw HTTP | - | ✅ 已实现 |

### 2.2 四大交互模式

| 模式 | 描述 | 入口组件 | 状态 |
|------|------|---------|------|
| **List Mode** | API 列表浏览与管理 | Collection 组件 | ✅ |
| **Request Builder** | HTTP 请求构建与发送 | RequestBuilder 组件 | ✅ |
| **AI Chat Mode** | AI 辅助 API 操作 | AI 组件 | ✅ |
| **Flow Canvas** | 可视化工作流编排 | FlowCanvas 组件 | ✅ |

### 2.3 FlowCanvas 可视化工作流

9 种节点类型，支持复杂 API 工作流编排：

| 节点类型 | 描述 | 状态 |
|------|------|------|
| `apiCall` | API 调用节点 | ✅ |
| `auth` | 认证设置节点 | ✅ |
| `condition` | 条件分支节点 | ✅ |
| `loop` | 循环执行节点 | ✅ |
| `transform` | 数据转换节点 | ✅ |
| `assert` | 断言验证节点 | ✅ |
| `delay` | 延迟等待节点 | ✅ |
| `log` | 日志输出节点 | ✅ |
| `script` | 脚本执行节点 | ✅ |

**执行引擎特性：**
- 拓扑排序执行（按依赖顺序）
- 节点状态显示（pending/running/success/error/skipped）
- 断点调试支持
- 子流程复用
- 并行执行控制

### 2.4 Mock 服务器

**32 种内置规则：**

| 规则 | 描述 | 示例输出 |
|------|------|---------|
| `name` | 姓名 | James Smith |
| `email` | 邮箱 | user@example.com |
| `phone` | 电话 | +1-555-123-4567 |
| `city` | 城市 | New York |
| `country` | 国家 | USA |
| `company` | 公司 | Acme Corp |
| `price` | 价格 | 49.99 |
| `uuid` | UUID | 550e8400-e29b-41d4-a716-446655440000 |
| `url` | 网址 | https://example.com |
| `ipv4` | IPv4 | 192.168.1.100 |
| `date` | 日期 | 2026-06-06 |
| `sequence` | 序列递增 | 1, 2, 3... |
| `random` | 随机字符串 | aB3x9k... |

**8 种动态生成器：**

| 规则 | 描述 | 示例输出 |
|------|------|---------|
| `$timestamp` | Unix 时间戳(ms) | 1750000000000 |
| `$date` | 当前日期 | 2026-06-07 |
| `$time` | 当前时间 | 14:30:00 |
| `$datetime` | ISO 日期时间 | 2026-06-07T14:30:00Z |
| `$randomInt` | 随机整数 | 7382 |
| `$randomFloat` | 随机浮点数 | 482.73 |
| `$seq` | 序列号 | SEQ_001 |
| `boolean` | 布尔值 | true/false |

**模板引擎语法：**
```javascript
{{fieldName}}           // 字段引用
{{$ruleName}}           // 内置规则
{{$randomInt 1 100}}    // 随机整数
{{$randomFloat 0 100 2}} // 随机浮点
{{$choice opt1 opt2}}   // 选项随机
{{$delay 1000}}         // 延迟(ms)
{{$env API_URL}}        // 环境变量
{{$workflow.userId}}    // 工作流变量
```

### 2.5 环境变量管理

- 多环境支持（Development/Production/Staging）
- 变量层级：全局变量 > 环境变量 > 工作流变量 > 节点输出
- 变量语法：`{{variableName}}`
- 变量替换预览

### 2.6 Git 版本控制

- Git 状态查看
- 提交历史记录
- 文件暂存与提交
- 分支创建与切换
- 差异比较
- 自动暂存功能

### 2.7 语义搜索

- 基于 Embedding 的语义搜索
- 自然语言 API 发现
- 相关性评分排序

### 2.8 代码生成

支持 8 种编程语言：

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

### 2.9 拦截器脚本

多阶段脚本执行：

| 阶段 | 描述 | 状态 |
|------|------|------|
| `preBuild` | URL 构建前执行 | ✅ |
| `preSend` | 发送前执行（可中止） | ✅ |
| `postResponse` | 响应后执行 | ✅ |
| `postError` | 错误时执行 | ✅ |

### 2.10 敏感数据检测与脱敏

自动检测和脱敏敏感信息：

- Bearer Token
- API Key
- 密码字段
- AWS 密钥
- 信用卡号
- 邮箱地址

### 2.11 浏览器扩展

<!-- TODO: 截图待添加 -->
![浏览器扩展截图](docs/assets/images/browser-extension.png)

- Chrome/Firefox 支持
- 请求自动捕获
- 一键导入 Flare

---

## 第三章：快速开始

### 3.1 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Node.js | >= 18.0.0 |
| Rust | 最新稳定版 |
| npm/yarn/pnpm | 最新稳定版 |

### 3.2 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-org/flare.git
cd flare

# 安装依赖
npm install

# 桌面应用额外依赖
cd src/desktop && npm install
cd ../..
```

### 3.3 启动应用

**开发模式：**

```bash
# 启动 CLI
npm run dev

# 启动桌面应用（需要同时运行 Vite 和 Tauri）
npm start

# 仅启动 Vite 开发服务器
npm run dev:desktop

# 仅启动 Tauri
npm run tauri:dev
```

**生产构建：**

```bash
# 构建全部（CLI + Desktop + Extension）
npm run build

# 仅构建桌面应用
npm run build:desktop

# 仅构建浏览器扩展
npm run build:extension
```

### 3.4 首次使用指南

1. **启动应用**
   ```bash
   npm start
   ```

2. **导入 API**
   ```bash
   flare-api add ./openapi.yaml
   ```

3. **发送请求**
   - 在 List Mode 中选择 API
   - 或在 Request Builder 中直接输入 URL

4. **使用 AI 辅助**
   - 切换到 AI Chat Mode
   - 用自然语言描述您的需求

### 3.5 快速示例

**导入 OpenAPI 文件：**
```bash
flare-api add https://petstore.swagger.io/v2/swagger.json
```

**搜索 API：**
```bash
flare-api search "user authentication"
```

**发送请求：**
```bash
flare-api run petstore GET /pet/1
```

**生成示例代码：**
```bash
flare-api example petstore GET /pet/1
```

---

## 第四章：安装配置

### 4.1 前置环境

**Node.js 安装：**
```bash
# 使用 nvm（推荐）
nvm install 18
nvm use 18

# 或直接从 nodejs.org 下载
```

**Rust 安装：**
```bash
# Windows
winget install Rustup

# 或从 rustup.rs 下载
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Tauri CLI 安装：**
```bash
npm install -g @tauri-apps/cli
```

### 4.2 安装方式

#### 4.2.1 从源码构建

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/flare.git
cd flare

# 2. 安装 Node 依赖
npm install

# 3. 构建应用
npm run build
```

#### 4.2.2 开发模式运行

```bash
# 终端 1：启动 Vite 开发服务器
npm run dev:desktop

# 终端 2：启动 Tauri
npm run tauri:dev

# 或使用 concurrently（自动并行启动）
npm start
```

#### 4.2.3 生产构建

```bash
# Windows
npm run build:desktop:win

# Linux
npm run build:desktop:linux
```

### 4.3 配置文件说明

| 文件 | 用途 |
|------|------|
| `package.json` | npm 配置和脚本 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置 |
| `src-tauri/Cargo.toml` | Rust 依赖 |
| `tsconfig.json` | TypeScript 主配置 |
| `src/desktop/tsconfig.json` | 桌面应用 TypeScript 配置 |
| `src/desktop/vite.config.ts` | Vite 构建配置 |
| `vitest.config.ts` | 测试配置 |

### 4.4 环境变量配置

```bash
# 创建环境变量文件
cp .env.example .env

# 编辑环境变量
vim .env
```

---

## 第五章：CLI 参考

### 命令总览

| 命令 | 描述 |
|------|------|
| `flare-api add <source>` | 导入 API |
| `flare-api list` | 列出所有 API |
| `flare-api search <query>` | 搜索 API |
| `flare-api run <api> [method] [path]` | 发送请求 |
| `flare-api env <ls\|use\|set>` | 环境变量管理 |
| `flare-api history <list\|replay\|diff>` | 请求历史 |
| `flare-api example <api> [method] [path]` | 生成示例代码 |
| `flare-api completion <bash\|zsh\|fish>` | 生成 Shell 自动补全 |
| `flare-api git <log\|diff\|commit\|...>` | Git 版本控制 |
| `flare-api worktree <list\|create\|remove\|...>` | Git Worktree 管理 |

### 5.1 add — 导入 API

```
flare-api add <source> [--auth-location <header|cookie|query|path>] [--auth-key <key>] [--auth-value <value>]
```

| 参数 | 描述 |
|------|------|
| `<source>` | 文件路径或 URL（支持 OpenAPI/Swagger/Postman/HAR） |

**示例：**
```bash
flare-api add ./openapi.yaml
flare-api add https://petstore.swagger.io/v2/swagger.json
```

### 5.2 list — 列出所有 API

```
flare-api list
```

无参数。列出所有已导入的 API 及其端点数量。

### 5.3 search — 搜索 API

```
flare-api search <query> [options]
```

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--limit <n>` | 限制结果数量 | 10 |
| `--offset <n>` | 分页偏移 | 0 |
| `--sort <name\|endpoints\|relevance>` | 排序方式 | relevance |
| `--format <brief\|detailed\|json>` | 输出格式 | brief |
| `--semantic` | 启用语义搜索 | - |

**示例：**
```bash
flare-api search "user authentication"
flare-api search "get user" --semantic --limit 20
```

### 5.4 run — 发送请求

```
flare-api run <api> [method] [path] [options]
```

| 参数 | 描述 |
|------|------|
| `<api>` | API 名称 |
| `[method]` | HTTP 方法（GET/POST/PUT/DELETE/PATCH） |
| `[path]` | 请求路径 |

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `-t, --timeout <ms>` | 请求超时（毫秒） | 30000 |
| `-H, --header <Key: Value>` | 添加请求头 | - |
| `-d, --data <body>` | 请求体 | - |
| `--curl` | 仅生成 cURL 命令 | - |

**示例：**
```bash
flare-api run github GET /repos
flare-api run stripe POST /payments -H "Authorization: Bearer sk_xxx"
flare-api run myapi POST /users -d '{"name":"test"}' --curl
```

### 5.5 env — 环境变量管理

```
flare-api env <ls|use|set> [args]
```

**列出环境：**
```bash
flare-api env ls
flare-api env list
```

**使用环境：**
```bash
flare-api env use <name>
```

**设置变量：**
```bash
flare-api env set <name> <key>=<value>
```

### 5.6 history — 请求历史

```
flare-api history <list|replay|diff|clear> [args]
```

**列出历史：**
```bash
flare-api history list [--limit <n>] [--method <METHOD>]
```

**重放请求：**
```bash
flare-api history replay <history_id>
```

**对比两次请求：**
```bash
flare-api history diff <history_id_1> <history_id_2>
```

**清除历史：**
```bash
flare-api history clear
```

### 5.7 example — 生成示例代码

```
flare-api example <api> [method] [path]
```

**示例：**
```bash
flare-api example github GET /repos
flare-api example petstore POST /pet -d '{"name":"dog"}'
```

### 5.8 git — Git 版本控制

```
flare-api git <subcommand> [args]
```

| 子命令 | 描述 |
|--------|------|
| `log` | 提交历史 |
| `diff` | 差异对比 |
| `commit` | 提交 |
| `status` | 状态 |
| `stage` | 暂存 |
| `unstage` | 取消暂存 |
| `branch` | 分支管理 |
| `checkout` | 切换分支 |
| `merge` | 合并 |
| `tag` | 标签管理 |
| `discard` | 丢弃更改 |
| `rollback` | 回滚 |

### 5.9 worktree — Git Worktree 管理

```
flare-api worktree <list|create|remove|switch|merge|cleanup> [args]
```

| 子命令 | 描述 |
|--------|------|
| `list` | 列出所有 worktree |
| `create <name>` | 创建 worktree |
| `remove <name>` | 删除 worktree |
| `switch <name>` | 切换到 worktree |
| `merge <name> [target]` | 合并到目标分支 |
| `cleanup` | 清理过期 worktree |

### 5.10 completion — Shell 补全

```
flare-api completion <bash|zsh|fish>
```

**示例：**
```bash
# Bash
flare-api completion bash >> ~/.bashrc

# Zsh
flare-api completion zsh >> ~/.zshrc

# Fish
flare-api completion fish >> ~/.config/fish/config.fish
```

---

## 第六章：桌面应用

### 6.1 界面布局

<!-- TODO: 截图待添加 -->
![界面布局截图](docs/assets/images/desktop-layout.png)

桌面应用采用多面板布局：

- **左侧边栏**：集合导航、API 列表
- **主区域**：Request Builder / Flow Canvas / AI Chat
- **右侧面板**：Response / Documentation
- **顶部**：模式切换、设置

### 6.2 List Mode 使用指南

List Mode 是默认进入的模式，用于浏览和管理 API 集合。

**功能：**
- 查看所有已导入的 API
- 按集合组织 API
- 搜索和过滤
- 导入/导出集合

### 6.3 Request Builder 使用指南

<!-- TODO: 截图待添加 -->
![Request Builder截图](docs/assets/images/request-builder.png)

#### 6.3.1 URL Bar

| 功能 | 快捷键 | 描述 |
|------|--------|------|
| Method 选择器 | - | GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS |
| URL 输入 | `Ctrl + L` | 支持路径变量 `{{baseUrl}}/users/:id` |
| 发送请求 | `Ctrl + Enter` | 发送请求 |
| 复制 cURL | `Ctrl + Shift + C` | 复制完整 cURL 命令 |

#### 6.3.2 Params Tab

- Key-Value 参数列表
- 启用/禁用开关
- 自动 URL 编码
- 参数校验

#### 6.3.3 Headers Tab

- 请求头 Key-Value 列表
- 快捷模板（Content-Type、Authorization 等）
- Preset 预设保存

#### 6.3.4 Body Tab

| 类型 | 描述 |
|------|------|
| none | 不发送 body |
| form-data | Key-Value + 文件上传 |
| x-www-form-urlencoded | URL 编码表单 |
| raw | 文本输入框（支持语法高亮） |
| binary | 文件选择上传 |
| GraphQL | Query + Variables |

#### 6.3.5 Auth Tab

| 类型 | 描述 |
|------|------|
| No Auth | 无认证 |
| Bearer Token | Bearer Token |
| Basic Auth | 用户名/密码 |
| API Key | Header/Query |
| OAuth 2.0 | 完整授权码流程 |
| AWS Signature | AWS 签名 |

#### 6.3.6 Scripts Tab

- Pre-request 脚本
- Post-response 脚本
- 代码编辑（Monaco Editor）
- 控制台输出

#### 6.3.7 Env Tab

- 环境变量列表
- 变量替换预览

### 6.4 Response Panel 使用指南

| 功能 | 描述 |
|------|------|
| 状态码 | HTTP 状态码 |
| 响应时间 | 耗时 ms |
| Pretty/Raw/Preview | 三种展示模式 |
| JSON 格式化 | JSON 折叠显示 |
| 响应头 | Headers 列表 |
| 复制响应 | 复制 Body |

### 6.5 AI Chat Mode 使用指南

<!-- TODO: 截图待添加 -->
![AI Chat截图](docs/assets/images/ai-chat.png)

- 自然语言交互
- AI 辅助 API 操作
- 命令执行
- 帮助面板

### 6.6 Flow Canvas 使用指南

<!-- TODO: 截图待添加 -->
![FlowCanvas截图](docs/assets/images/flow-canvas.png)

**工作流程：**
1. 从节点面板拖拽节点到画布
2. 连接节点定义执行顺序
3. 配置每个节点的参数
4. 点击执行按钮运行流程

### 6.7 设置面板

| 设置类别 | 功能 |
|---------|------|
| 核心设置 | 超时、跟随重定向 |
| SSL/TLS | SSL 验证、客户端证书 |
| 界面设置 | 主题、字体大小、语言 |
| 通用设置 | 自动保存、敏感数据脱敏 |
| Git 设置 | 自动暂存、启动初始化 |

---

## 第七章：API 格式支持

### 7.1 OpenAPI 3.x / Swagger 2.0

```bash
# 导入 OpenAPI 3.x
flare-api add ./openapi.yaml

# 导入 Swagger 2.0
flare-api add ./swagger.json
```

**检测方法：**
- OpenAPI 3.x: `openapi.startsWith('3.')`
- Swagger 2.0: `swagger === '2.0'`

### 7.2 AsyncAPI 2.x

```bash
flare-api add ./asyncapi.yaml
```

**检测方法：** `asyncapi.startsWith('2.')`

### 7.3 GraphQL

```bash
flare-api add ./schema.graphql
```

**检测方法：** `type Query/Mutation`

**支持功能：**
- Schema 内省
- 类型文档
- 查询执行

### 7.4 Postman Collection v2.1

```bash
flare-api add ./postman_collection.json
```

**检测方法：** `getpostman.com`

### 7.5 HAR (HTTP Archive)

```bash
flare-api add ./requests.har
```

**检测方法：** `har.1.2`

### 7.6 Raw HTTP Request

支持直接解析原始 HTTP 请求文本。

### 7.7 中间表示（IR）说明

所有格式都会被解析为统一的中间表示（IR），包含：

- API 元数据（名称、描述、版本）
- 端点列表
- 请求/响应定义
- 认证配置
- 协议信息

---

## 第八章：Mock 服务器

### 8.1 内置规则（32 种）

**基础规则：**

| 规则 | 描述 | 示例输出 |
|------|------|---------|
| `auto` | 智能识别 | - |
| `name` | 姓名 | James Smith |
| `email` | 邮箱 | user@example.com |
| `phone` | 电话 | +1-555-123-4567 |
| `city` | 城市 | New York |
| `country` | 国家 | USA |
| `company` | 公司 | Acme Corp |
| `price` | 价格 | 49.99 |
| `address` | 地址 | 123 Main St |
| `avatar` | 头像 URL | https://... |
| `uuid` | UUID | 550e8400-... |
| `url` | 网址 | https://... |
| `ipv4` | IPv4 | 192.168.1.100 |
| `ipv6` | IPv6 | 2001:0db8:... |
| `lat` | 纬度 | 40.712776 |
| `lng` | 经度 | -74.005974 |
| `zip` | 邮编 | 10001 |
| `color` | 颜色 | #FF5733 |
| `rating` | 评分 | 4.5 |
| `age` | 年龄 | 25 |
| `date` | 日期 | 2026-06-06 |
| `sequence` | 序列递增 | 1, 2, 3... |
| `random` | 随机字符串 | aB3x9k... |
| `nullify` | 清空值 | (空字符串) |

**动态生成器：**

| 规则 | 描述 | 示例输出 |
|------|------|---------|
| `$timestamp` | Unix 时间戳(ms) | 1750000000000 |
| `$date` | 当前日期 | 2026-06-07 |
| `$time` | 当前时间 | 14:30:00 |
| `$datetime` | ISO 日期时间 | 2026-06-07T14:30:00Z |
| `$randomInt` | 随机整数 | 7382 |
| `$randomFloat` | 随机浮点数 | 482.73 |
| `$seq` | 序列号 | SEQ_001 |
| `boolean` | 布尔值 | true/false |

### 8.2 动态生成器（8 种）

详见上表 8.1 动态生成器部分。

### 8.3 模板语法

```javascript
// 字段引用
{{fieldName}}

// 内置规则
{{$email}}
{{$uuid}}

// 随机整数
{{$randomInt 1 100}}

// 随机浮点
{{$randomFloat 0 100 2}}

// 选项随机
{{$choice yes no maybe}}

// 延迟
{{$delay 1000}}
{{$delay 500-2000}}

// 环境变量
{{$env API_URL}}

// 工作流变量
{{$workflow.userId}}

// 节点输出
{{$node1.response.data}}
```

### 8.4 请求匹配规则

| 匹配类型 | 描述 | 优先级 |
|---------|------|--------|
| Path Pattern | 路径匹配 | P0 |
| Method | HTTP 方法 | P0 |
| Query Params | 查询参数匹配 | P1 |
| Request Headers | Header 匹配 | P1 |
| Body JSON Path | JSON Body 路径匹配 | P2 |
| Regex Pattern | 正则路径匹配 | P2 |

### 8.5 OpenAPI 自动 Mock

从 OpenAPI spec 自动生成 mock：

```bash
# 基于 OpenAPI 自动生成 mock
flare-api mock --openapi ./openapi.yaml
```

**智能生成优先级：**
1. Schema format 精确匹配（最高）
2. 字段名智能识别
3. Schema type 兜底
4. random 随机字符串（最终兜底）

---

## 第九章：MCP 集成

### 9.1 什么是 MCP

MCP（Model Context Protocol）是一个标准协议，允许 AI Agent 与外部工具和服务进行交互。Flare 提供了完整的 MCP Server 实现，让 AI Agent 能够：

- 列出所有已导入的 API
- 获取 API 详细信息
- 执行 API 请求
- 语义搜索 API

### 9.2 MCP 工具列表

#### 9.2.1 list_apis

列出所有已导入的 API。

```json
{
  "name": "list_apis",
  "description": "List all imported APIs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": { "type": "number", "description": "Max results" }
    }
  }
}
```

#### 9.2.2 get_api

获取特定 API 的详细信息。

```json
{
  "name": "get_api",
  "description": "Get API details",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "description": "API name" }
    }
  }
}
```

#### 9.2.3 execute_request

执行 API 请求。

```json
{
  "name": "execute_request",
  "description": "Execute an API request",
  "inputSchema": {
    "type": "object",
    "properties": {
      "api": { "type": "string" },
      "method": { "type": "string" },
      "path": { "type": "string" },
      "params": { "type": "object" }
    }
  }
}
```

#### 9.2.4 search_apis

语义搜索 API。

```json
{
  "name": "search_apis",
  "description": "Semantic search for APIs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    }
  }
}
```

### 9.3 配置 MCP Server

```bash
# 启动 MCP Server
npx flare-api mcp

# 或在配置文件中指定
# {
#   "mcpServers": {
#     "flare": {
#       "command": "npx",
#       "args": ["flare-api", "mcp"]
#     }
#   }
# }
```

### 9.4 AI Agent 使用示例

```javascript
// 使用 MCP SDK 连接 Flare
import { Client } from '@modelcontextprotocol/sdk/client';

const client = new Client({
  name: 'my-agent',
  version: '1.0.0'
});

await client.connectTo({
  command: 'npx',
  args: ['flare-api', 'mcp']
});

// 列出所有 API
const apis = await client.callTool({
  name: 'list_apis',
  arguments: { limit: 10 }
});

// 搜索 API
const results = await client.callTool({
  name: 'search_apis',
  arguments: { query: 'user authentication' }
});

// 执行请求
const response = await client.callTool({
  name: 'execute_request',
  arguments: {
    api: 'github',
    method: 'GET',
    path: '/users/octocat'
  }
});
```

---

## 第十章：浏览器扩展

### 10.1 功能说明

Flare 浏览器扩展允许您：

- 自动捕获浏览器中的 HTTP 请求
- 一键将请求导入 Flare
- 快速测试和调试

### 10.2 安装指南

**Chrome：**
1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `src/extension/dist` 目录

**Firefox：**
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时加载附加组件」
3. 选择 `src/extension/manifest.json`

### 10.3 使用说明

1. 点击扩展图标激活捕获
2. 在浏览器中操作您的应用
3. 扩展自动记录所有 HTTP 请求
4. 点击请求可查看详情或导入 Flare

### 10.4 权限说明

| 权限 | 用途 |
|------|------|
| `webRequest` | 捕获 HTTP 请求 |
| `storage` | 存储扩展配置 |
| `activeTab` | 访问当前标签页 |

---

## 第十一章：开发指南

### 11.1 项目结构

```
flare/
├── src/
│   ├── cli/                    # CLI 应用入口
│   │   ├── index.ts           # 主入口
│   │   └── commands/          # 子命令
│   ├── desktop/               # Tauri 桌面应用
│   │   └── src/
│   │       ├── App.tsx        # React 主组件
│   │       ├── main.tsx       # React 入口
│   │       ├── components/    # React 组件
│   │       ├── store/         # Zustand 状态
│   │       ├── services/      # Tauri IPC
│   │       ├── hooks/         # 自定义 Hooks
│   │       ├── types/         # TypeScript 类型
│   │       └── utils/         # 工具函数
│   ├── parsers/               # API 格式解析器
│   │   ├── openapi.ts
│   │   ├── asyncapi.ts
│   │   ├── graphql.ts
│   │   ├── postman.ts
│   │   └── har.ts
│   ├── ir/                    # 中间表示
│   ├── mcp/                   # MCP Server
│   ├── storage/               # 数据持久化
│   ├── search/                # 搜索功能
│   ├── collaboration/         # 协作功能
│   ├── extension/             # 浏览器扩展
│   └── utils/                 # 工具函数
├── src-tauri/                 # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── docs/                      # 文档
├── scripts/                   # 构建脚本
└── package.json
```

### 11.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2.x | Rust 后端 + Web 前端 |
| 前端框架 | React 18 + TypeScript | 函数式组件 + Hooks |
| 状态管理 | Zustand | 轻量级状态管理 |
| 代码编辑 | Monaco Editor | VS Code 同款编辑器 |
| 样式方案 | CSS Modules + CSS Variables | 作用域样式 |
| 构建工具 | Vite | 快速开发体验 |
| HTTP 客户端 | reqwest | Rust HTTP 客户端 |
| 异步运行时 | tokio | Rust 异步运行时 |
| Web 框架 | axum | Rust Web 框架 |
| CLI 框架 | @oclif/core | Node.js CLI |
| MCP SDK | @modelcontextprotocol/sdk | AI Agent 集成 |
| API 验证 | Zod | Schema 验证 |

### 11.3 开发环境搭建

```bash
# 1. 安装依赖
npm install

# 2. 桌面应用依赖
cd src/desktop && npm install && cd ../..

# 3. 启动开发服务器
npm start
```

### 11.4 代码规范

**TypeScript：**
- 使用函数式组件和 Hooks
- 避免使用类组件
- 优先使用 const
- 严格类型检查

**Rust：**
- 遵循 Rust 编码规范
- 使用 tokio 异步编程
- 错误处理使用 Result

**样式：**
- 使用 CSS Modules 避免冲突
- CSS Variables 管理主题
- 遵循 BEM 命名规范

### 11.5 测试指南

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npx vitest run src/parsers/openapi.test.ts
```

### 11.6 贡献指南

1. Fork 仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add new feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

---

## 第十二章：常见问题

### 12.1 安装问题

**Q: npm install 失败怎么办？**

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

**Q: Tauri 构建失败？**

```bash
# 确保 Rust 环境正确
rustc --version
cargo --version

# 更新 Rust
rustup update
```

### 12.2 使用问题

**Q: 如何导入 Postman 集合？**

```bash
flare-api add ./collection.json
```

**Q: 变量不生效？**

确保使用正确的语法：`{{variableName}}`，变量必须在环境中定义。

**Q: Mock 服务器不返回响应？**

检查请求匹配规则，确保路径、方法和参数都正确匹配。

### 12.3 功能问题

**Q: FlowCanvas 如何实现循环？**

使用 `loop` 节点，设置循环条件和迭代变量。

**Q: 如何配置 OAuth 2.0？**

在 Auth Tab 中选择 OAuth 2.0，填写授权 URL、访问令牌 URL、客户端 ID、客户端密钥和作用域。

---

## 第十三章：更新日志

### v1.6 (2026-06-14)

**功能更新：**
- Mock 服务扩展中
- 状态化 Mock 支持

### v1.5 (2026-06-02)

**功能更新：**
- MCP Server 完善
- 语义搜索增强

### v1.0 (2026-01-01)

**初始版本：**
- 基础 API 导入和测试
- 四种 UI 模式
- FlowCanvas 可视化工作流
- Mock 服务器
- CLI 工具
- 浏览器扩展

---

## 第十四章：许可证

MIT License

Copyright (c) 2024-2026 Flare Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 附录

### A. 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + B` | 切换侧边栏 |
| `Ctrl + E` | 打开环境设置 |
| `Ctrl + ,` | 打开应用设置 |
| `Ctrl + N` | 新建/重置请求 |
| `Ctrl + Enter` | 发送请求 |
| `Ctrl + Shift + C` | 复制完整 cURL |
| `Ctrl + L` | 聚焦 URL 输入框 |
| `Ctrl + 1~8` | 切换模式 |
| `Ctrl + Tab` | 下一个模式 |
| `Ctrl + Shift + Tab` | 上一个模式 |

### B. 相关资源

- [SPEC.md](./docs/SPEC.md) - 详细技术规格
- [CLI.md](./docs/CLI.md) - CLI 命令参考
- [STRATEGY.md](./STRATEGY.md) - 项目策略

---

*本文档由 Flare 自动生成，如有问题请提交 Issue。*
