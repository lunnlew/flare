# Flare API Development Tool

**Version:** 1.6
**Last Updated:** 2026-06-14
**Status:** Iterating Continuously

---

## Project Overview

<!-- TODO: Screenshot to be added -->
![Overview Screenshot](docs/assets/images/overview.png)

---

## Table of Contents

- [Chapter 1: Project Overview](#chapter-1-project-overview)
- [Chapter 2: Features](#chapter-2-features)
- [Chapter 3: Quick Start](#chapter-3-quick-start)
- [Chapter 4: Installation & Configuration](#chapter-4-installation--configuration)
- [Chapter 5: CLI Reference](#chapter-5-cli-reference)
- [Chapter 6: Desktop Application](#chapter-6-desktop-application)
- [Chapter 7: API Format Support](#chapter-7-api-format-support)
- [Chapter 8: Mock Server](#chapter-8-mock-server)
- [Chapter 9: MCP Integration](#chapter-9-mcp-integration)
- [Chapter 10: Browser Extension](#chapter-10-browser-extension)
- [Chapter 11: Development Guide](#chapter-11-development-guide)
- [Chapter 12: FAQ](#chapter-12-faq)
- [Chapter 13: Changelog](#chapter-13-changelog)
- [Chapter 14: License](#chapter-14-license)

---

## Chapter 1: Project Overview

### 1.1 What is Flare

Flare is a modern API development tool designed to be a production-grade API management tool on par with Postman/Insomnia/Apifox, while maintaining its unique positioning as an "API tool for the AI Agent era."

**Core Capability:** Parses various API definition formats (OpenAPI, AsyncAPI, GraphQL, Postman, HAR) into a unified Intermediate Representation (IR), enabling both humans and AI Agents to uniformly access and operate APIs.

### 1.2 Core Value Proposition

**Problem Solved:**
- API format fragmentation makes it difficult for Agents and humans to uniformly access APIs
- Different formats require separate processing; no unified intermediate layer

**Solution:**
- Establish tool advantages at the application layer through unified IR format
- Enable humans to efficiently search and test APIs via Desktop/CLI/Web/Chat
- Enable Agents to accurately understand and execute API tasks via MCP/Skill/CLI/Agent

### 1.3 Comparison with Traditional Tools

| Feature | Flare | Postman | Insomnia | Apifox |
|---------|-------|---------|----------|--------|
| AI Agent Native Support | ✅ MCP Server | ❌ | ❌ | ❌ |
| Multi-format Unified IR | ✅ 6 formats | ❌ | ❌ | ❌ |
| Semantic Search | ✅ Embedding | ❌ | ❌ | ❌ |
| Git Version Control | ✅ Native | ❌ | ❌ | ❌ |
| FlowCanvas Visualization | ✅ 9 node types | ❌ | ❌ | ❌ |
| Browser Extension | ✅ | ❌ | ❌ | ❌ |

### 1.4 Use Cases

- **API Development & Testing**: Build, test, and debug API requests
- **Team Collaboration**: Share API collections, unified management
- **AI Agent Integration**: Provide standardized API operations for AI Agents
- **Documentation Generation**: Auto-generate docs from API definitions
- **Mock Server**: Quickly set up mock servers based on API definitions

### 1.5 Target Users

**Primary (Humans):**
- API Developers
- QA/Test Engineers
- Using Desktop/CLI/Web/Chat for API search, testing, documentation management

**Secondary (Agents):**
- AI Agents
- Accessing API capabilities via MCP/Skill/CLI/Agent

---

## Chapter 2: Features

### 2.1 Multi-format API Parsing

Unified parsing support for 6 major API formats:

| Format | Version | Status |
|--------|---------|--------|
| OpenAPI | 3.x | ✅ Implemented |
| Swagger | 2.0 | ✅ Implemented |
| AsyncAPI | 2.x | ✅ Implemented |
| GraphQL | - | ✅ Implemented |
| Postman Collection | v2.1 | ✅ Implemented |
| HAR | 1.2 | ✅ Implemented |
| Raw HTTP | - | ✅ Implemented |

### 2.2 Four Interaction Modes

| Mode | Description | Entry Component | Status |
|------|-------------|-----------------|--------|
| **List Mode** | API list browsing & management | Collection component | ✅ |
| **Request Builder** | HTTP request building & sending | RequestBuilder component | ✅ |
| **AI Chat Mode** | AI-assisted API operations | AI component | ✅ |
| **Flow Canvas** | Visual workflow orchestration | FlowCanvas component | ✅ |

### 2.3 FlowCanvas Visual Workflow

9 node types supporting complex API workflow orchestration:

| Node Type | Description | Status |
|-----------|-------------|--------|
| `apiCall` | API Call node | ✅ |
| `auth` | Authentication setup node | ✅ |
| `condition` | Conditional branch node | ✅ |
| `loop` | Loop execution node | ✅ |
| `transform` | Data transformation node | ✅ |
| `assert` | Assertion verification node | ✅ |
| `delay` | Delay/wait node | ✅ |
| `log` | Log output node | ✅ |
| `script` | Script execution node | ✅ |

**Execution Engine Features:**
- Topological sort execution (by dependency order)
- Node status display (pending/running/success/error/skipped)
- Breakpoint debugging support
- Sub-workflow reuse
- Parallel execution control

### 2.4 Mock Server

**32 Built-in Rules:**

| Rule | Description | Example Output |
|------|-------------|----------------|
| `name` | Full name | James Smith |
| `email` | Email address | user@example.com |
| `phone` | Phone number | +1-555-123-4567 |
| `city` | City | New York |
| `country` | Country | USA |
| `company` | Company | Acme Corp |
| `price` | Price | 49.99 |
| `uuid` | UUID | 550e8400-e29b-41d4-a716-446655440000 |
| `url` | Website URL | https://example.com |
| `ipv4` | IPv4 address | 192.168.1.100 |
| `date` | Date | 2026-06-06 |
| `sequence` | Sequence increment | 1, 2, 3... |
| `random` | Random string | aB3x9k... |

**8 Dynamic Generators:**

| Rule | Description | Example Output |
|------|-------------|----------------|
| `$timestamp` | Unix timestamp (ms) | 1750000000000 |
| `$date` | Current date | 2026-06-07 |
| `$time` | Current time | 14:30:00 |
| `$datetime` | ISO datetime | 2026-06-07T14:30:00Z |
| `$randomInt` | Random integer | 7382 |
| `$randomFloat` | Random float | 482.73 |
| `$seq` | Sequence number | SEQ_001 |
| `boolean` | Boolean value | true/false |

**Template Engine Syntax:**
```javascript
{{fieldName}}              // Field reference
{{$ruleName}}             // Built-in rule
{{$randomInt 1 100}}     // Random integer
{{$randomFloat 0 100 2}} // Random float
{{$choice opt1 opt2}}     // Random choice
{{$delay 1000}}           // Delay (ms)
{{$env API_URL}}          // Environment variable
{{$workflow.userId}}      // Workflow variable
```

### 2.5 Environment Variable Management

- Multi-environment support (Development/Production/Staging)
- Variable hierarchy: Global > Environment > Workflow > Node Output
- Variable syntax: `{{variableName}}`
- Variable substitution preview

### 2.6 Git Version Control

- Git status viewing
- Commit history records
- File staging and committing
- Branch creation and switching
- Diff comparison
- Auto-staging feature

### 2.7 Semantic Search

- Embedding-based semantic search
- Natural language API discovery
- Relevance scoring and sorting

### 2.8 Code Generation

Support for 8 programming languages:

| Language | Description | Status |
|----------|-------------|--------|
| Python | Python requests | ✅ |
| Java | Java OkHttp | ✅ |
| Go | Go http.Client | ✅ |
| JavaScript | Fetch API | ✅ |
| cURL | cURL command | ✅ |
| PHP | PHP cURL | ✅ |
| C# | C# HttpClient | ✅ |
| Ruby | Ruby Net::HTTP | ✅ |

### 2.9 Interceptor Scripts

Multi-stage script execution:

| Stage | Description | Status |
|-------|-------------|--------|
| `preBuild` | Execute before URL construction | ✅ |
| `preSend` | Execute before sending (can abort) | ✅ |
| `postResponse` | Execute after response | ✅ |
| `postError` | Execute on error | ✅ |

### 2.10 Sensitive Data Detection & Masking

Automatic detection and masking of sensitive information:

- Bearer Token
- API Key
- Password fields
- AWS Keys
- Credit card numbers
- Email addresses

### 2.11 Browser Extension

<!-- TODO: Screenshot to be added -->
![Browser Extension Screenshot](docs/assets/images/browser-extension.png)

- Chrome/Firefox support
- Automatic request capture
- One-click import to Flare

---

## Chapter 3: Quick Start

### 3.1 Environment Requirements

| Dependency | Version Requirement |
|------------|-------------------|
| Node.js | >= 18.0.0 |
| Rust | Latest stable |
| npm/yarn/pnpm | Latest stable |

### 3.2 Installation Steps

```bash
# Clone the project
git clone https://github.com/your-org/flare.git
cd flare

# Install dependencies
npm install

# Desktop app additional dependencies
cd src/desktop && npm install
cd ../..
```

### 3.3 Starting the Application

**Development Mode:**

```bash
# Start CLI
npm run dev

# Start desktop app (requires both Vite and Tauri)
npm start

# Start Vite dev server only
npm run dev:desktop

# Start Tauri only
npm run tauri:dev
```

**Production Build:**

```bash
# Build all (CLI + Desktop + Extension)
npm run build

# Build desktop app only
npm run build:desktop

# Build browser extension only
npm run build:extension
```

### 3.4 First-Time User Guide

1. **Start the application**
   ```bash
   npm start
   ```

2. **Import an API**
   ```bash
   flare-api add ./openapi.yaml
   ```

3. **Send a request**
   - Select an API in List Mode
   - Or directly enter URL in Request Builder

4. **Use AI assistance**
   - Switch to AI Chat Mode
   - Describe your needs in natural language

### 3.5 Quick Examples

**Import an OpenAPI file:**
```bash
flare-api add https://petstore.swagger.io/v2/swagger.json
```

**Search APIs:**
```bash
flare-api search "user authentication"
```

**Send a request:**
```bash
flare-api run petstore GET /pet/1
```

**Generate example code:**
```bash
flare-api example petstore GET /pet/1
```

---

## Chapter 4: Installation & Configuration

### 4.1 Prerequisites

**Node.js Installation:**
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

**Rust Installation:**
```bash
# Windows
winget install Rustup

# Or from rustup.rs
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Tauri CLI Installation:**
```bash
npm install -g @tauri-apps/cli
```

### 4.2 Installation Methods

#### 4.2.1 Build from Source

```bash
# 1. Clone the repository
git clone https://github.com/your-org/flare.git
cd flare

# 2. Install Node dependencies
npm install

# 3. Build the application
npm run build
```

#### 4.2.2 Run in Development Mode

```bash
# Terminal 1: Start Vite dev server
npm run dev:desktop

# Terminal 2: Start Tauri
npm run tauri:dev

# Or use concurrently (auto-parallel startup)
npm start
```

#### 4.2.3 Production Build

```bash
# Windows
npm run build:desktop:win

# Linux
npm run build:desktop:linux
```

### 4.3 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | npm configuration and scripts |
| `src-tauri/tauri.conf.json` | Tauri application configuration |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `tsconfig.json` | TypeScript main configuration |
| `src/desktop/tsconfig.json` | Desktop app TypeScript config |
| `src/desktop/vite.config.ts` | Vite build configuration |
| `vitest.config.ts` | Test configuration |

### 4.4 Environment Variables

```bash
# Create environment file
cp .env.example .env

# Edit environment variables
vim .env
```

---

## Chapter 5: CLI Reference

### Command Overview

| Command | Description |
|---------|-------------|
| `flare-api add <source>` | Import API |
| `flare-api list` | List all APIs |
| `flare-api search <query>` | Search APIs |
| `flare-api run <api> [method] [path]` | Send request |
| `flare-api env <ls\|use\|set>` | Environment variable management |
| `flare-api history <list\|replay\|diff>` | Request history |
| `flare-api example <api> [method] [path]` | Generate example code |
| `flare-api completion <bash\|zsh\|fish>` | Generate shell completion |
| `flare-api git <log\|diff\|commit\|...>` | Git version control |
| `flare-api worktree <list\|create\|remove\|...>` | Git worktree management |

### 5.1 add — Import API

```
flare-api add <source> [--auth-location <header|cookie|query|path>] [--auth-key <key>] [--auth-value <value>]
```

| Parameter | Description |
|-----------|-------------|
| `<source>` | File path or URL (supports OpenAPI/Swagger/Postman/HAR) |

**Examples:**
```bash
flare-api add ./openapi.yaml
flare-api add https://petstore.swagger.io/v2/swagger.json
```

### 5.2 list — List All APIs

```
flare-api list
```

No parameters. Lists all imported APIs with their endpoint counts.

### 5.3 search — Search APIs

```
flare-api search <query> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Limit result count | 10 |
| `--offset <n>` | Pagination offset | 0 |
| `--sort <name\|endpoints\|relevance>` | Sort method | relevance |
| `--format <brief\|detailed\|json>` | Output format | brief |
| `--semantic` | Enable semantic search | - |

**Examples:**
```bash
flare-api search "user authentication"
flare-api search "get user" --semantic --limit 20
```

### 5.4 run — Send Request

```
flare-api run <api> [method] [path] [options]
```

| Parameter | Description |
|-----------|-------------|
| `<api>` | API name |
| `[method]` | HTTP method (GET/POST/PUT/DELETE/PATCH) |
| `[path]` | Request path |

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --timeout <ms>` | Request timeout (ms) | 30000 |
| `-H, --header <Key: Value>` | Add request header | - |
| `-d, --data <body>` | Request body | - |
| `--curl` | Only generate cURL command | - |

**Examples:**
```bash
flare-api run github GET /repos
flare-api run stripe POST /payments -H "Authorization: Bearer sk_xxx"
flare-api run myapi POST /users -d '{"name":"test"}' --curl
```

### 5.5 env — Environment Variable Management

```
flare-api env <ls|use|set> [args]
```

**List environments:**
```bash
flare-api env ls
flare-api env list
```

**Use environment:**
```bash
flare-api env use <name>
```

**Set variable:**
```bash
flare-api env set <name> <key>=<value>
```

### 5.6 history — Request History

```
flare-api history <list|replay|diff|clear> [args]
```

**List history:**
```bash
flare-api history list [--limit <n>] [--method <METHOD>]
```

**Replay request:**
```bash
flare-api history replay <history_id>
```

**Diff two requests:**
```bash
flare-api history diff <history_id_1> <history_id_2>
```

**Clear history:**
```bash
flare-api history clear
```

### 5.7 example — Generate Example Code

```
flare-api example <api> [method] [path]
```

**Examples:**
```bash
flare-api example github GET /repos
flare-api example petstore POST /pet -d '{"name":"dog"}'
```

### 5.8 git — Git Version Control

```
flare-api git <subcommand> [args]
```

| Subcommand | Description |
|------------|-------------|
| `log` | Commit history |
| `diff` | Diff comparison |
| `commit` | Commit |
| `status` | Status |
| `stage` | Stage |
| `unstage` | Unstage |
| `branch` | Branch management |
| `checkout` | Switch branch |
| `merge` | Merge |
| `tag` | Tag management |
| `discard` | Discard changes |
| `rollback` | Rollback |

### 5.9 worktree — Git Worktree Management

```
flare-api worktree <list|create|remove|switch|merge|cleanup> [args]
```

| Subcommand | Description |
|------------|-------------|
| `list` | List all worktrees |
| `create <name>` | Create worktree |
| `remove <name>` | Remove worktree |
| `switch <name>` | Switch to worktree |
| `merge <name> [target]` | Merge to target branch |
| `cleanup` | Clean up expired worktrees |

### 5.10 completion — Shell Completion

```
flare-api completion <bash|zsh|fish>
```

**Examples:**
```bash
# Bash
flare-api completion bash >> ~/.bashrc

# Zsh
flare-api completion zsh >> ~/.zshrc

# Fish
flare-api completion fish >> ~/.config/fish/config.fish
```

---

## Chapter 6: Desktop Application

### 6.1 Interface Layout

<!-- TODO: Screenshot to be added -->
![Interface Layout Screenshot](docs/assets/images/desktop-layout.png)

The desktop application uses a multi-panel layout:

- **Left Sidebar**: Collection navigation, API list
- **Main Area**: Request Builder / Flow Canvas / AI Chat
- **Right Panel**: Response / Documentation
- **Top**: Mode switching, Settings

### 6.2 List Mode Guide

List Mode is the default mode for browsing and managing API collections.

**Features:**
- View all imported APIs
- Organize APIs by collection
- Search and filter
- Import/export collections

### 6.3 Request Builder Guide

<!-- TODO: Screenshot to be added -->
![Request Builder Screenshot](docs/assets/images/request-builder.png)

#### 6.3.1 URL Bar

| Feature | Shortcut | Description |
|---------|----------|-------------|
| Method selector | - | GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS |
| URL input | `Ctrl + L` | Supports path variables `{{baseUrl}}/users/:id` |
| Send request | `Ctrl + Enter` | Send the request |
| Copy cURL | `Ctrl + Shift + C` | Copy full cURL command |

#### 6.3.2 Params Tab

- Key-Value parameter list
- Enable/disable toggle
- Automatic URL encoding
- Parameter validation

#### 6.3.3 Headers Tab

- Request header Key-Value list
- Quick templates (Content-Type, Authorization, etc.)
- Preset saving

#### 6.3.4 Body Tab

| Type | Description |
|------|-------------|
| none | No body sent |
| form-data | Key-Value + file upload |
| x-www-form-urlencoded | URL-encoded form |
| raw | Text input (syntax highlighting) |
| binary | File selection upload |
| GraphQL | Query + Variables |

#### 6.3.5 Auth Tab

| Type | Description |
|------|-------------|
| No Auth | No authentication |
| Bearer Token | Bearer Token |
| Basic Auth | Username/password |
| API Key | Header/Query |
| OAuth 2.0 | Full authorization code flow |
| AWS Signature | AWS signature |

#### 6.3.6 Scripts Tab

- Pre-request scripts
- Post-response scripts
- Code editing (Monaco Editor)
- Console output

#### 6.3.7 Env Tab

- Environment variable list
- Variable substitution preview

### 6.4 Response Panel Guide

| Feature | Description |
|---------|-------------|
| Status code | HTTP status code |
| Response time | Time spent in ms |
| Pretty/Raw/Preview | Three display modes |
| JSON formatting | JSON folding display |
| Response headers | Headers list |
| Copy response | Copy body |

### 6.5 AI Chat Mode Guide

<!-- TODO: Screenshot to be added -->
![AI Chat Screenshot](docs/assets/images/ai-chat.png)

- Natural language interaction
- AI-assisted API operations
- Command execution
- Help panel

### 6.6 Flow Canvas Guide

<!-- TODO: Screenshot to be added -->
![FlowCanvas Screenshot](docs/assets/images/flow-canvas.png)

**Workflow:**
1. Drag nodes from node panel to canvas
2. Connect nodes to define execution order
3. Configure parameters for each node
4. Click execute button to run flow

### 6.7 Settings Panel

| Settings Category | Features |
|-----------------|---------|
| Core Settings | Timeout, follow redirects |
| SSL/TLS | SSL verification, client certificates |
| Interface | Theme, font size, language |
| General | Auto-save, sensitive data masking |
| Git | Auto-staging, startup initialization |

---

## Chapter 7: API Format Support

### 7.1 OpenAPI 3.x / Swagger 2.0

```bash
# Import OpenAPI 3.x
flare-api add ./openapi.yaml

# Import Swagger 2.0
flare-api add ./swagger.json
```

**Detection methods:**
- OpenAPI 3.x: `openapi.startsWith('3.')`
- Swagger 2.0: `swagger === '2.0'`

### 7.2 AsyncAPI 2.x

```bash
flare-api add ./asyncapi.yaml
```

**Detection method:** `asyncapi.startsWith('2.')`

### 7.3 GraphQL

```bash
flare-api add ./schema.graphql
```

**Detection method:** `type Query/Mutation`

**Supported features:**
- Schema introspection
- Type documentation
- Query execution

### 7.4 Postman Collection v2.1

```bash
flare-api add ./postman_collection.json
```

**Detection method:** `getpostman.com`

### 7.5 HAR (HTTP Archive)

```bash
flare-api add ./requests.har
```

**Detection method:** `har.1.2`

### 7.6 Raw HTTP Request

Supports direct parsing of raw HTTP request text.

### 7.7 Intermediate Representation (IR)

All formats are parsed into a unified Intermediate Representation containing:

- API metadata (name, description, version)
- Endpoint list
- Request/response definitions
- Authentication configuration
- Protocol information

---

## Chapter 8: Mock Server

### 8.1 Built-in Rules (32 types)

**Basic Rules:**

| Rule | Description | Example Output |
|------|-------------|----------------|
| `auto` | Smart detection | - |
| `name` | Full name | James Smith |
| `email` | Email address | user@example.com |
| `phone` | Phone number | +1-555-123-4567 |
| `city` | City | New York |
| `country` | Country | USA |
| `company` | Company | Acme Corp |
| `price` | Price | 49.99 |
| `address` | Address | 123 Main St |
| `avatar` | Avatar URL | https://... |
| `uuid` | UUID | 550e8400-... |
| `url` | Website URL | https://... |
| `ipv4` | IPv4 address | 192.168.1.100 |
| `ipv6` | IPv6 address | 2001:0db8:... |
| `lat` | Latitude | 40.712776 |
| `lng` | Longitude | -74.005974 |
| `zip` | Zip code | 10001 |
| `color` | Color | #FF5733 |
| `rating` | Rating | 4.5 |
| `age` | Age | 25 |
| `date` | Date | 2026-06-06 |
| `sequence` | Sequence increment | 1, 2, 3... |
| `random` | Random string | aB3x9k... |
| `nullify` | Clear value | (empty string) |

**Dynamic Generators:**

| Rule | Description | Example Output |
|------|-------------|----------------|
| `$timestamp` | Unix timestamp (ms) | 1750000000000 |
| `$date` | Current date | 2026-06-07 |
| `$time` | Current time | 14:30:00 |
| `$datetime` | ISO datetime | 2026-06-07T14:30:00Z |
| `$randomInt` | Random integer | 7382 |
| `$randomFloat` | Random float | 482.73 |
| `$seq` | Sequence number | SEQ_001 |
| `boolean` | Boolean value | true/false |

### 8.2 Dynamic Generators (8 types)

See table 8.1 Dynamic Generators section above.

### 8.3 Template Syntax

```javascript
// Field reference
{{fieldName}}

// Built-in rule
{{$email}}
{{$uuid}}

// Random integer
{{$randomInt 1 100}}

// Random float
{{$randomFloat 0 100 2}}

// Random choice
{{$choice yes no maybe}}

// Delay
{{$delay 1000}}
{{$delay 500-2000}}

// Environment variable
{{$env API_URL}}

// Workflow variable
{{$workflow.userId}}

// Node output
{{$node1.response.data}}
```

### 8.4 Request Matching Rules

| Matching Type | Description | Priority |
|--------------|-------------|----------|
| Path Pattern | Path matching | P0 |
| Method | HTTP method | P0 |
| Query Params | Query parameter matching | P1 |
| Request Headers | Header matching | P1 |
| Body JSON Path | JSON body path matching | P2 |
| Regex Pattern | Regex path matching | P2 |

### 8.5 OpenAPI Auto Mock

Auto-generate mock from OpenAPI spec:

```bash
# Auto-generate mock based on OpenAPI
flare-api mock --openapi ./openapi.yaml
```

**Smart generation priority:**
1. Schema format exact match (highest)
2. Field name smart detection
3. Schema type fallback
4. random string (final fallback)

---

## Chapter 9: MCP Integration

### 9.1 What is MCP

MCP (Model Context Protocol) is a standard protocol that allows AI Agents to interact with external tools and services. Flare provides a complete MCP Server implementation that enables AI Agents to:

- List all imported APIs
- Get API details
- Execute API requests
- Semantic search APIs

### 9.2 MCP Tools List

#### 9.2.1 list_apis

List all imported APIs.

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

Get details of a specific API.

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

Execute an API request.

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

Semantic search for APIs.

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

### 9.3 Configure MCP Server

```bash
# Start MCP Server
npx flare-api mcp

# Or specify in configuration file
# {
#   "mcpServers": {
#     "flare": {
#       "command": "npx",
#       "args": ["flare-api", "mcp"]
#     }
#   }
# }
```

### 9.4 AI Agent Usage Example

```javascript
// Connect to Flare using MCP SDK
import { Client } from '@modelcontextprotocol/sdk/client';

const client = new Client({
  name: 'my-agent',
  version: '1.0.0'
});

await client.connectTo({
  command: 'npx',
  args: ['flare-api', 'mcp']
});

// List all APIs
const apis = await client.callTool({
  name: 'list_apis',
  arguments: { limit: 10 }
});

// Search APIs
const results = await client.callTool({
  name: 'search_apis',
  arguments: { query: 'user authentication' }
});

// Execute request
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

## Chapter 10: Browser Extension

### 10.1 Features

The Flare browser extension allows you to:

- Automatically capture HTTP requests in browser
- One-click import requests to Flare
- Quick testing and debugging

### 10.2 Installation Guide

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked extension"
4. Select `src/extension/dist` directory

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `src/extension/manifest.json`

### 10.3 Usage

1. Click extension icon to enable capture
2. Operate your application in browser
3. Extension automatically records all HTTP requests
4. Click request to view details or import to Flare

### 10.4 Permissions

| Permission | Purpose |
|------------|---------|
| `webRequest` | Capture HTTP requests |
| `storage` | Store extension configuration |
| `activeTab` | Access current tab |

---

## Chapter 11: Development Guide

### 11.1 Project Structure

```
flare/
├── src/
│   ├── cli/                    # CLI application entry
│   │   ├── index.ts           # Main entry
│   │   └── commands/          # Subcommands
│   ├── desktop/               # Tauri desktop application
│   │   └── src/
│   │       ├── App.tsx        # React main component
│   │       ├── main.tsx       # React entry
│   │       ├── components/    # React components
│   │       ├── store/         # Zustand stores
│   │       ├── services/      # Tauri IPC
│   │       ├── hooks/         # Custom hooks
│   │       ├── types/         # TypeScript types
│   │       └── utils/         # Utilities
│   ├── parsers/               # API format parsers
│   │   ├── openapi.ts
│   │   ├── asyncapi.ts
│   │   ├── graphql.ts
│   │   ├── postman.ts
│   │   └── har.ts
│   ├── ir/                    # Intermediate Representation
│   ├── mcp/                   # MCP Server
│   ├── storage/               # Data persistence
│   ├── search/                # Search functionality
│   ├── collaboration/         # Collaboration features
│   ├── extension/             # Browser extension
│   └── utils/                 # Utilities
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── docs/                      # Documentation
├── scripts/                   # Build scripts
└── package.json
```

### 11.2 Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| Desktop Framework | Tauri 2.x | Rust backend + Web frontend |
| Frontend Framework | React 18 + TypeScript | Functional components + Hooks |
| State Management | Zustand | Lightweight state management |
| Code Editor | Monaco Editor | VS Code editor component |
| Styling | CSS Modules + CSS Variables | Scoped styles |
| Build Tool | Vite | Fast development experience |
| HTTP Client | reqwest | Rust HTTP client |
| Async Runtime | tokio | Rust async runtime |
| Web Framework | axum | Rust web framework |
| CLI Framework | @oclif/core | Node.js CLI |
| MCP SDK | @modelcontextprotocol/sdk | AI Agent integration |
| API Validation | Zod | Schema validation |

### 11.3 Development Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Desktop app dependencies
cd src/desktop && npm install && cd ../..

# 3. Start development server
npm start
```

### 11.4 Code Standards

**TypeScript:**
- Use functional components and Hooks
- Avoid class components
- Prefer const
- Strict type checking

**Rust:**
- Follow Rust coding standards
- Use tokio for async programming
- Error handling using Result

**Styling:**
- Use CSS Modules to avoid conflicts
- CSS Variables for theming
- Follow BEM naming convention

### 11.5 Testing Guide

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx vitest run src/parsers/openapi.test.ts
```

### 11.6 Contributing Guide

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add new feature'`
4. Push branch: `git push origin feature/your-feature`
5. Create Pull Request

---

## Chapter 12: FAQ

### 12.1 Installation Issues

**Q: npm install failed, what should I do?**

```bash
# Clear cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

**Q: Tauri build failed?**

```bash
# Ensure Rust environment is correct
rustc --version
cargo --version

# Update Rust
rustup update
```

### 12.2 Usage Issues

**Q: How to import Postman collection?**

```bash
flare-api add ./collection.json
```

**Q: Variables not working?**

Ensure correct syntax is used: `{{variableName}}`, and the variable must be defined in the environment.

**Q: Mock server not returning response?**

Check request matching rules to ensure path, method, and parameters all match correctly.

### 12.3 Feature Issues

**Q: How to implement loops in FlowCanvas?**

Use the `loop` node, set loop conditions and iteration variables.

**Q: How to configure OAuth 2.0?**

Select OAuth 2.0 in Auth Tab, fill in authorization URL, access token URL, client ID, client secret, and scope.

---

## Chapter 13: Changelog

### v1.6 (2026-06-14)

**Feature Updates:**
- Mock service expansion in progress
- Stateful Mock support

### v1.5 (2026-06-02)

**Feature Updates:**
- MCP Server improvements
- Enhanced semantic search

### v1.0 (2026-01-01)

**Initial Version:**
- Basic API import and testing
- Four UI modes
- FlowCanvas visual workflow
- Mock server
- CLI tool
- Browser extension

---

## Chapter 14: License

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

## Appendix

### A. Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `Ctrl + B` | Toggle sidebar |
| `Ctrl + E` | Open environment settings |
| `Ctrl + ,` | Open app settings |
| `Ctrl + N` | New/reset request |
| `Ctrl + Enter` | Send request |
| `Ctrl + Shift + C` | Copy full cURL |
| `Ctrl + L` | Focus URL input |
| `Ctrl + 1~8` | Switch mode |
| `Ctrl + Tab` | Next mode |
| `Ctrl + Shift + Tab` | Previous mode |

### B. Related Resources

- [SPEC.md](./docs/SPEC.md) - Detailed technical specification
- [CLI.md](./docs/CLI.md) - CLI command reference
- [STRATEGY.md](./STRATEGY.md) - Project strategy

---

*This documentation was auto-generated by Flare. For issues, please submit an Issue.*
