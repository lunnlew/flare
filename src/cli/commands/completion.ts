/**
 * Shell Completion Generator
 * Generates completion scripts for bash, zsh, and fish
 */

export type ShellType = 'bash' | 'zsh' | 'fish';

const COMMANDS = [
  'add',
  'list',
  'search',
  'run',
  'env',
  'history',
  'example',
];

const OPTIONS = [
  '--help',
  '--version',
];

/**
 * Generate bash completion script
 */
export function generateBashCompletion(): string {
  const cmds = COMMANDS.join(' ');
  return `#!/bin/bash

# flare-api bash completion

_flare_api() {
  local cur prev words
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Commands
  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${cmds}" -- "$cur") )
    return 0
  fi

  # Command-specific options
  case "\${prev}" in
    add)
      COMPREPLY=( $(compgen -W "--auth-location --auth-key --auth-value" -- "$cur") )
      ;;
    run)
      COMPREPLY=( $(compgen -W "GET POST PUT DELETE PATCH" -- "$cur") )
      ;;
    history)
      COMPREPLY=( $(compgen -W "list replay diff" -- "$cur") )
      ;;
    example)
      COMPREPLY=( $(compgen -W "GET POST PUT DELETE PATCH" -- "$cur") )
      ;;
  esac

  return 0
}

complete -F _flare_api flare-api
complete -F _flare_api npx flare-api
`;
}

/**
 * Generate zsh completion script
 */
export function generateZshCompletion(): string {
  return `#!/usr/bin/env zsh

# flare-api zsh completion

_flare_api() {
  local -a commands
  commands=(
    'add:Import API from source'
    'list:List all APIs'
    'search:Search APIs'
    'run:Send API request'
    'env:Environment variables'
    'history:Request history'
    'example:Generate example'
  )

  local -a add_options
  add_options=(
    '--auth-location[Auth location]:(header cookie query path)'
    '--auth-key[Auth key name]'
    '--auth-value[Auth key value]'
  )

  local -a run_methods
  run_methods=(
    'GET' 'POST' 'PUT' 'DELETE' 'PATCH'
  )

  local -a history_cmds
  history_cmds=(
    'list:List history'
    'replay:Replay request'
    'diff:Compare requests'
  )

  _arguments -C \\
    '1: :->command' \\
    '2: :->args' \\
    '3: :->subargs'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case \${words[1]} in
        add)
          _describe 'option' add_options
          ;;
        run)
          _describe 'method' run_methods
          ;;
        history)
          _describe 'history-command' history_cmds
          ;;
        example)
          _describe 'method' run_methods
          ;;
      esac
      ;;
  esac

  return 0
}

_flare_api "$@"
`;
}

/**
 * Generate fish completion script
 */
export function generateFishCompletion(): string {
  return `# flare-api fish completion

function __fish_flare_api_needs_command
  set -l cmd (commandline -opc)
  return (count $cmd) - 1
end

function __fish_flare_api_uses_command
  set -l cmd (commandline -opc)
  set -l last_cmd $cmd[-1]
  for c in add list search run env history example
    if test "$last_cmd" = "$c"
      return 0
    end
  end
  return 1
end

# Add command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'add' -d 'Import API from source'
complete -c flare-api -n '__fish_flare_api_uses_command' -a 'add' -l auth-location -d 'Auth location' -f -r -a 'header cookie query path'
complete -c flare-api -n '__fish_flare_api_uses_command' -a 'add' -l auth-key -d 'Auth key name' -f
complete -c flare-api -n '__fish_flare_api_uses_command' -a 'add' -l auth-value -d 'Auth key value' -f

# List command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'list' -d 'List all APIs'

# Search command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'search' -d 'Search APIs'

# Run command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'run' -d 'Send API request'
complete -c flare-api -n '__fish_flare_api_uses_command' -a 'run' -f -a 'GET POST PUT DELETE PATCH' -d 'HTTP method'

# Env command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'env' -d 'Environment variables'

# History command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'history' -d 'Request history'
complete -c flare-api -n '__fish_flare_api_uses_command' -a 'history' -f -a 'list replay diff' -d 'History command'

# Example command
complete -c flare-api -n '__fish_flare_api_needs_command' -f -a 'example' -d 'Generate example'
complete -c flare-api -n '__fish_flare_api_uses_command' -a 'example' -f -a 'GET POST PUT DELETE PATCH' -d 'HTTP method'
`;
}

/**
 * Generate completion script for specified shell
 */
export function generateCompletion(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}

/**
 * Get installation instructions for the shell
 */
export function getCompletionInstallInstructions(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return `# Add to ~/.bashrc or ~/.bash_profile:
echo 'source <(flare-api completion bash)' >> ~/.bashrc
source ~/.bashrc

# Or save to a file:
flare-api completion bash > ~/.flare-api-completion.bash
echo 'source ~/.flare-api-completion.bash' >> ~/.bashrc`;

    case 'zsh':
      return `# Add to ~/.zshrc:
echo 'source <(flare-api completion zsh)' >> ~/.zshrc
source ~/.zshrc

# Or save to a file:
flare-api completion zsh > ~/.flare-api-completion.zsh
echo 'source ~/.flare-api-completion.zsh' >> ~/.zshrc`;

    case 'fish':
      return `# Copy completion file to fish config:
flare-api completion fish > ~/.config/fish/completions/flare-api.fish

# Or use curl to install system-wide:
curl -sL https://raw.githubusercontent.com/your-org/flare-api/main completions/flare-api.fish > ~/.config/fish/completions/flare-api.fish`;
  }
}

/**
 * CLI command handler for completion
 */
export async function completionCommand(args: string[]) {
  const [shellArg] = args;
  const shell = shellArg as ShellType;

  if (!shell || !['bash', 'zsh', 'fish'].includes(shell)) {
    console.log(`Usage: flare-api completion [bash|zsh|fish]`);
    console.log(`\nGenerate shell completion script:`);
    console.log(`  flare-api completion bash   # Bash`);
    console.log(`  flare-api completion zsh    # Zsh`);
    console.log(`  flare-api completion fish   # Fish`);
    console.log(`\nTo install, run:`);
    console.log(`  flare-api completion bash | source`);
    console.log(`  flare-api completion bash > ~/.flare-api-completion.bash`);
    process.exit(1);
  }

  console.log(generateCompletion(shell));
}