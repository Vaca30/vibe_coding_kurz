# Claude Code Predefined Tools

This document lists all the built-in tools available in Claude Code. Tool names are the exact strings used in permission rules, subagent tool lists, and hook matchers.

To add custom tools, connect an MCP server. To extend Claude with reusable prompt-based workflows, write a skill (which runs through the existing `Skill` tool).

## Complete Tool Reference

| Tool | Description | Permission Required |
| :--- | :---------- | :------------------ |
| `Agent` | Spawns a subagent with its own context window to handle a task | No |
| `AskUserQuestion` | Asks multiple-choice questions to gather requirements or clarify ambiguity | No |
| `Bash` | Executes shell commands in your environment | Yes |
| `CronCreate` | Schedules a recurring or one-shot prompt within the current session (gone when Claude exits) | No |
| `CronDelete` | Cancels a scheduled task by ID | No |
| `CronList` | Lists all scheduled tasks in the session | No |
| `Edit` | Makes targeted edits to specific files | Yes |
| `EnterPlanMode` | Switches to plan mode to design an approach before coding | No |
| `EnterWorktree` | Creates an isolated git worktree and switches into it | No |
| `ExitPlanMode` | Presents a plan for approval and exits plan mode | Yes |
| `ExitWorktree` | Exits a worktree session and returns to the original directory | No |
| `Glob` | Finds files based on pattern matching | No |
| `Grep` | Searches for patterns in file contents | No |
| `ListMcpResourcesTool` | Lists resources exposed by connected MCP servers | No |
| `LSP` | Code intelligence via language servers: jump to definitions, find references, report type errors and warnings | No |
| `NotebookEdit` | Modifies Jupyter notebook cells | Yes |
| `PowerShell` | Executes PowerShell commands on Windows (opt-in preview) | Yes |
| `Read` | Reads the contents of files | No |
| `ReadMcpResourceTool` | Reads a specific MCP resource by URI | No |
| `SendMessage` | Sends a message to an agent team teammate, or resumes a subagent by its agent ID (requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | No |
| `Skill` | Executes a skill within the main conversation | Yes |
| `TaskCreate` | Creates a new task in the task list | No |
| `TaskGet` | Retrieves full details for a specific task | No |
| `TaskList` | Lists all tasks with their current status | No |
| `TaskOutput` | (Deprecated) Retrieves output from a background task. Prefer `Read` on the task's output file path | No |
| `TaskStop` | Kills a running background task by ID | No |
| `TaskUpdate` | Updates task status, dependencies, details, or deletes tasks | No |
| `TeamCreate` | Creates an agent team with multiple teammates (requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | No |
| `TeamDelete` | Disbands an agent team and cleans up teammate processes (requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | No |
| `TodoWrite` | Manages the session task checklist. Available in non-interactive mode and the Agent SDK; interactive sessions use `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate` instead | No |
| `ToolSearch` | Searches for and loads deferred tools when tool search is enabled | No |
| `WebFetch` | Fetches content from a specified URL | Yes |
| `WebSearch` | Performs web searches | Yes |
| `Write` | Creates or overwrites files | Yes |

## Tool Details

### Core File Operations

- **Read** - Reads files from the filesystem
  - Supports reading images, PDFs, and Jupyter notebooks
  - Supports line offset and limit for large files
  - For PDFs larger than 10 pages, use the `pages` parameter

- **Write** - Creates or overwrites files
  - Overwrites existing files if one exists at the provided path
  - Read the file first before overwriting existing files

- **Edit** - Makes targeted string replacements in files
  - Performs exact string replacements (`old_string` -> `new_string`)
  - Supports `replace_all` for renaming across a file
  - Fails if `old_string` is not unique — provide more context to disambiguate

- **Glob** - Pattern matching to find files
  - Supports glob patterns like `**/*.js` or `src/**/*.ts`
  - Returns matching file paths sorted by modification time

- **Grep** - Search file contents with regex patterns
  - Built on ripgrep for performance
  - Supports context lines (`-A`, `-B`, `-C`)
  - Output modes: `content`, `files_with_matches`, `count`
  - Filter by file type or glob patterns

- **NotebookEdit** - Modifies Jupyter notebook cells
  - Replace, insert, or delete cells
  - Supports code and markdown cell types

### System & Command Execution

- **Bash** - Executes shell commands
  - Working directory persists across commands
  - Environment variables do **not** persist across commands
  - Supports background execution with `run_in_background`
  - Can be scoped (e.g., `Bash(git:*)` for only git commands)
  - Activate virtualenvs/conda before launching Claude Code for persistence

- **PowerShell** - Executes PowerShell commands on Windows (opt-in preview)
  - Set `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` to enable
  - Auto-detects `pwsh.exe` (7+) with fallback to `powershell.exe` (5.1)
  - Bash tool remains registered alongside

### Web Capabilities

- **WebSearch** - Performs web searches for current information
  - Provides up-to-date information beyond training cutoff

- **WebFetch** - Fetches and analyzes content from URLs
  - Converts HTML to markdown
  - Includes 15-minute cache for performance
  - Cannot fetch JavaScript-rendered content

### Agent & Task Orchestration

- **Agent** - Spawns subagents with their own context windows
  - Multiple agent types: `general-purpose`, `Explore`, `Plan`, `statusline-setup`
  - Can launch multiple agents in parallel
  - Agents run autonomously and return results
  - Supports `isolation: "worktree"` for isolated repo copies

- **TaskCreate** / **TaskGet** / **TaskList** / **TaskUpdate** / **TaskStop** - Task management
  - Create, track, and manage tasks during execution
  - Track progress with states: pending, in_progress, completed
  - `TaskOutput` is deprecated — use `Read` on the task's output file instead

- **TodoWrite** - Session task checklist (non-interactive / Agent SDK only)
  - In interactive sessions, use `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate` instead

- **SendMessage** - Agent team communication (experimental)
  - Send messages to teammates or resume subagents
  - Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

- **TeamCreate** / **TeamDelete** - Agent team management (experimental)
  - Create and disband agent teams
  - Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

### Planning & Worktrees

- **EnterPlanMode** - Switches to plan mode to design an approach before coding

- **ExitPlanMode** - Presents a plan for approval and exits plan mode

- **EnterWorktree** - Creates an isolated git worktree and switches into it

- **ExitWorktree** - Exits a worktree session and returns to the original directory

### Scheduling

- **CronCreate** - Schedules a recurring or one-shot prompt within the current session
  - Tasks are gone when Claude exits

- **CronDelete** - Cancels a scheduled task by ID

- **CronList** - Lists all scheduled tasks in the session

### Code Intelligence

- **LSP** - Language server protocol integration
  - Jump to a symbol's definition
  - Find all references to a symbol
  - Get type information at a position
  - List symbols in a file or workspace
  - Find implementations of an interface
  - Trace call hierarchies
  - Automatically reports type errors/warnings after file edits
  - Requires a code intelligence plugin to be installed

### Interactive Features

- **AskUserQuestion** - Asks clarifying questions during execution
  - Supports multiple-choice options
  - Used to gather requirements or resolve ambiguity

- **Skill** - Executes user-defined skills (reusable prompt-based workflows)
  - Skills are defined in project configuration or installed via plugins

- **ToolSearch** - Searches for and loads deferred tools on demand
  - Useful when many MCP tools are available
  - Supports exact selection (`select:Read,Edit`) and keyword search

### MCP Integration

- **ListMcpResourcesTool** - Lists resources exposed by connected MCP servers

- **ReadMcpResourceTool** - Reads a specific MCP resource by URI

MCP servers extend Claude Code with additional tools beyond the built-in set. Configure them in `.claude/settings.json` or project settings.

## Tool Scoping & Permissions

Tools can be restricted using `allowed_tools` and `disallowed_tools`:

```python
# Specific tools only
allowed_tools=["Read", "Write", "Bash(git:*)"]

# Exclude dangerous operations
disallowed_tools=["Bash(rm:*)", "Bash(dd:*)"]
```

To disable a tool entirely, add its name to the `deny` array in permission settings.

## Permission Modes

Control tool approval with `permission_mode`:

- `default` - CLI prompts for tools that require permission
- `acceptEdits` - Auto-accept file edits
- `bypassPermissions` - Allow all tools (use with caution)

Permission rules can be configured using `/permissions` or in settings.

## References

- [Tools reference](https://code.claude.com/docs/en/tools-reference)
- [MCP servers](https://code.claude.com/docs/en/mcp) - Add custom tools
- [Permissions](https://code.claude.com/docs/en/permissions) - Permission system and rules
- [Subagents](https://code.claude.com/docs/en/sub-agents) - Configure tool access for subagents
- [Hooks](https://code.claude.com/docs/en/hooks-guide) - Run custom commands before/after tool execution
- [Skills](https://code.claude.com/docs/en/skills) - Reusable prompt-based workflows
