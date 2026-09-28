---
name: flare-api-spec
last_updated: 2026-06-02
---

# flare-api-spec Strategy

## Target problem

AI Agent时代需要工具将各种API格式（OpenAPI、AsyncAPI、GraphQL等）解析成统一格式，但格式碎片化导致Agent和人类难以统一访问API——不同格式需要分别处理，没有统一中间层。

## Our approach

通过统一的IR格式，在应用层建立工具优势——让人类通过桌面/CLI/Web/Chat高效搜索和测试API，让Agent通过MCP/Skill/CLI/Agent准确理解和执行API任务。

## Who it's for

**Primary (人类):** API开发者、测试工程师——使用Desktop/CLI/Web/Chat进行API搜索、测试、文档管理

**Secondary (Agent):** AI Agent——通过MCP/Skill/CLI/Agent连接获取API能力，执行API任务

## Key metrics

- **导入成功率** - API格式成功解析为IR的比例（人类侧）
- **执行成功率** - API请求成功完成的比例（人类侧）
- **解析准确率** - Agent获取的API信息正确完整的比例（Agent侧）
- **资源完善率** - API元数据（描述、参数、响应）完整度（Agent侧）

## Tracks

### 格式与解析
多格式解析为统一IR——支持OpenAPI、AsyncAPI、GraphQL、Postman、Raw HTTP五种格式，输出标准化中间格式
_Why it serves the approach:_ 统一格式的前提是覆盖所有主流API定义格式，这是整个系统的输入层

### 交互与搜索
多模式UI + 语义搜索——Flow Canvas、List Mode、AI Chat、Request Builder四种模式，加上embedding自然语言搜索
_Why it serves the approach:_ 人类用户通过多模式高效完成搜索、测试、文档工作，语义搜索让人类和Agent用自然语言发现API

### Agent 集成
MCP Server + Skill接口——MCP over stdio，暴露list_apis、get_api、execute_request、search_apis工具，支持Agent worktree隔离
_Why it serves the approach:_ Agent通过标准接口消费IR，实现准确理解和执行API任务

### 存储与协作
Git存储 + 历史 + 协作——.flare目录管理API定义、worktree隔离、history持久化、共享集合、版本控制
_Why it serves the approach:_ 可靠的版本控制、Agent隔离和团队协作是工具可信度的基础

## Marketing

**One-liner:** 智能易用的API请求+测试工具

**Key message:** 统一格式，多端入口；Agent能用，人类易用