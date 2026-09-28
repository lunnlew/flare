# Flare CLI 参数速查表

**版本:** 1.0
**更新日期:** 2026-06-09

---

## 命令总览

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

---

## 1. add — 导入 API

```
flare-api add <source> [--auth-location <header|cookie|query|path>] [--auth-key <key>] [--auth-value <value>]
```

| 参数 | 描述 |
|------|------|
| `<source>` | 文件路径或 URL（支持 OpenAPI/Swagger/Postman/HAR） |

| 选项 | 描述 |
|------|------|
| `--auth-location` | 认证位置：`header`/`cookie`/`query`/`path` |
| `--auth-key` | 认证 key 名称 |
| `--auth-value` | 认证 key 值 |
| `--auth-cookie` | 完整 cookie 字符串（直接设置） |

---

## 2. list — 列出所有 API

```
flare-api list
```

无参数。列出所有已导入的 API 及其端点数量。

---

## 3. search — 搜索 API

```
flare-api search <query> [options]
```

| 参数 | 描述 |
|------|------|
| `<query>` | 搜索关键词 |

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--limit <n>` | 限制结果数量 | 10 |
| `--offset <n>` | 分页偏移 | 0 |
| `--sort <name\|endpoints\|relevance>` | 排序方式 | relevance |
| `--format <brief\|detailed\|json>` | 输出格式 | brief |
| `--show-scores` | 显示相关性得分 | - |
| `--semantic` | 启用语义搜索 | - |
| `--json` | 输出 JSON 格式 | - |

---

## 4. run — 发送请求

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
| `-H, --header <Key: Value>` | 添加请求头（可多次使用） | - |
| `-d, --data <body>` | 请求体 | - |
| `--curl` | 仅生成 cURL 命令并退出 | - |

**示例：**
```bash
flare-api run github GET /repos
flare-api run stripe POST /payments -H "Authorization: Bearer sk_xxx"
flare-api run myapi POST /users -d '{"name":"test"}' --curl
```

---

## 5. env — 环境变量

```
flare-api env <ls|use|set> [args]
```

### 5.1 列出环境

```
flare-api env ls
flare-api env list
```

### 5.2 使用环境

```
flare-api env use <name>
```

### 5.3 设置变量

```
flare-api env set <name> <key>=<value>
```

---

## 6. history — 请求历史

```
flare-api history <list|replay|diff|clear> [args]
```

### 6.1 list — 列出历史

```
flare-api history list [--limit <n>] [--offset <n>] [--method <METHOD>] [--url <url>]
```

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--limit <n>` | 限制数量 | 20 |
| `--offset <n>` | 分页偏移 | 0 |
| `--method <METHOD>` | 按方法过滤 | - |
| `--url <url>` | 按 URL 过滤 | - |

### 6.2 replay — 重放请求

```
flare-api history replay <history_id> [--var KEY=VALUE ...]
```

| 参数 | 描述 |
|------|------|
| `<history_id>` | 历史记录 ID（格式：`h_xxx`） |

| 选项 | 描述 |
|------|------|
| `--var KEY=VALUE` | 变量替换（可多次使用） |

### 6.3 diff — 对比两次请求

```
flare-api history diff <history_id_1> <history_id_2>
```

### 6.4 clear — 清除历史

```
flare-api history clear
```

---

## 7. example — 生成示例代码

```
flare-api example <api> [method] [path]
```

| 参数 | 描述 |
|------|------|
| `<api>` | API 名称 |
| `[method]` | HTTP 方法 |
| `[path]` | 请求路径 |

---

## 8. completion — Shell 自动补全

```
flare-api completion <bash|zsh|fish>
```

输出对应 Shell 的自动补全脚本。

---

## 9. git — Git 版本控制

```
flare-api git <subcommand> [args]
```

### 9.1 git log — 提交历史

```
flare-api git log [--api <name>] [--limit <n>] [--format <brief|json>]
```

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--api, -a <name>` | 筛选 API | - |
| `--limit, -n <n>` | 限制数量 | 10 |
| `--format, -f <format>` | 输出格式 | brief |

### 9.2 git diff — 差异对比

```
flare-api git diff <api-name> [commitA] [commitB]
```

### 9.3 git commit — 提交

```
flare-api git commit -m "message"
```

### 9.4 git status — 状态

```
flare-api git status [--all|-a]
```

### 9.5 git stage — 暂存

```
flare-api git stage <file>...
```

### 9.6 git unstage — 取消暂存

```
flare-api git unstage <file>...
```

### 9.7 git branch — 分支管理

```
flare-api git branch [-l|--list] [-c|--create <name>] [-d|--delete <name>]
```

### 9.8 git checkout — 切换分支

```
flare-api git checkout <branch>
```

### 9.9 git merge — 合并

```
flare-api git merge <branch>
```

### 9.10 git tag — 标签管理

```
flare-api git tag <name> [-m "message"]
flare-api git tag -l  # 列出标签
```

### 9.11 git discard — 丢弃更改

```
flare-api git discard <file>
```

### 9.12 git rollback — 回滚

```
flare-api git rollback <api-name> <commit>
```

---

## 10. worktree — Git Worktree 管理

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

| 选项 | 描述 |
|------|------|
| `--branch <name>` | 创建时指定分支 |

---

## 全局选项

| 选项 | 描述 |
|------|------|
| `--help, -h` | 显示帮助 |
| `--version, -v` | 显示版本 |