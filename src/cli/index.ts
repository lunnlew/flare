#!/usr/bin/env node

import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { runCommand } from './commands/run.js';
import { envCommand } from './commands/env.js';
import { historyCommand } from './commands/history.js';
import { exampleCommand } from './commands/example.js';
import { completionCommand } from './commands/completion.js';
import { gitLogCommand, gitDiffCommand, gitCommitCommand, gitStatusCommand,
         gitStageCommand, gitUnstageCommand, gitBranchCommand, gitCheckoutCommand,
         gitMergeCommand, gitTagCommand, gitDiscardCommand, gitRollbackCommand } from './commands/git.js';

const gitCommands: Record<string, any> = {
  log: gitLogCommand,
  diff: gitDiffCommand,
  commit: gitCommitCommand,
  status: gitStatusCommand,
  stage: gitStageCommand,
  unstage: gitUnstageCommand,
  branch: gitBranchCommand,
  checkout: gitCheckoutCommand,
  merge: gitMergeCommand,
  tag: gitTagCommand,
  discard: gitDiscardCommand,
  rollback: gitRollbackCommand,
};

const commands: Record<string, any> = {
  add: addCommand,
  list: listCommand,
  search: searchCommand,
  run: runCommand,
  env: envCommand,
  history: historyCommand,
  example: exampleCommand,
  completion: completionCommand,
};

async function main() {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log('flare-api-spec v0.1.0');
    return;
  }

  // Handle git subcommands
  if (command === 'git') {
    const [gitSubCommand, ...gitArgs] = rest;
    const handler = gitCommands[gitSubCommand];
    if (!handler) {
      console.error(`Unknown git command: ${gitSubCommand}`);
      printGitHelp();
      process.exit(1);
    }
    try {
      await handler(gitArgs);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  try {
    await handler(rest);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
flare-api-spec - AI Agent时代的 API SPEC 工具

Usage: flare-api <command> [options]

Commands:
  add <source>      导入 API (支持 OpenAPI, AsyncAPI, GraphQL, Postman, HAR, curl)
  list              列出所有 API
  search <query>    搜索 API
  run <api>         发送请求
  env               环境变量管理
  history           请求历史管理 (list, replay, diff)
  example <api>     生成 API 请求/响应示例
  completion <shell> 生成 Shell 补全脚本 (bash/zsh/fish)
  git               Git 版本控制命令

Git Commands:
  log [--api <name>] [--limit <n>]    查看提交历史
  diff <api> [commitA] [commitB]      比较版本差异
  commit -m <message>                  提交更改
  status [--all]                      查看状态
  stage <file>...                     暂存文件
  unstage <file>...                    取消暂存
  branch [-l] [-c <name>] [-d <name>] 分支管理
  checkout <branch>                    切换分支
  merge <branch>                       合并分支
  tag [-l] [<name> [-m <message>]]    标签管理
  discard <file>                       放弃更改
  rollback <api> <commit>              回滚到指定版本

Examples:
  flare-api add https://petstore.swagger.io/v2/swagger.json
  flare-api add ./my-api.yaml
  flare-api list
  flare-api search payment
  flare-api run github GET /repos
  flare-api example github GET /repos
  flare-api env ls
  flare-api history list
  flare-api history replay h_xxx
  flare-api history diff h_xxx h_yyy
  flare-api completion bash
  flare-api git log --limit 10
  flare-api git diff github-api abc123
  flare-api git commit -m "Update API"

Options:
  --help, -h        显示帮助
  --version, -v     显示版本
`);
}

function printGitHelp() {
  console.log(`
Git Commands:
  log [--api <name>] [--limit <n>]    查看提交历史
  diff <api> [commitA] [commitB]      比较版本差异
  commit -m <message>                  提交更改
  status [--all]                      查看状态
  stage <file>...                     暂存文件
  unstage <file>...                    取消暂存
  branch [-l] [-c <name>] [-d <name>] 分支管理
  checkout <branch>                    切换分支
  merge <branch>                       合并分支
  tag [-l] [<name> [-m <message>]]    标签管理
  discard <file>                       放弃更改
  rollback <api> <commit>              回滚到指定版本
`);
}

main();