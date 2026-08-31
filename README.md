# Phoenix v3

**Distributed AI Agent Orchestration Platform** — A modern web UI for managing multiple concurrent AI agents (Claude Code, Cursor, Pi, etc.) across projects.

## Features

### 🎯 Core Capabilities

- **Agent Orchestration**: Create and manage AI agent instances with different personalities and expertise
- **Task Scheduling**: Cron-like scheduling for recurring tasks (daily, custom times)
- **Project Management**: Organize work by outcome with dedicated working directories
- **Cost Tracking**: Multi-level cost visibility (total, by project/agent/provider)
- **Recovery System**: Automatic snapshots and resume-from-checkpoint on failures
- **Retry Engine**: Configurable retry policies with exponential backoff
- **Webhook Integration**: Real-time state updates from agents
- **Plugin Architecture**: REST-based extensibility (Telegram example included)
- **Custom Skills**: Register and allocate custom skills to agents
- **Theme System**: 5 built-in themes with light/dark/auto modes

### 📊 Dashboard & Visibility

- System-wide metrics (total cost, active runs, failed runs)
- Cost breakdown by provider/agent/project
- Budget overflow alerts
- Recent run history with filtering
- Project and agent management

### 🔒 Reliability

- Backup/restore with retention policy
- Structured logging with multiple levels
- Error boundaries and graceful fallbacks
- Working directory preservation
- Recovery snapshots

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, TypeScript
- **Database**: SQLite with async/await API
- **Scheduler**: node-cron for task scheduling
- **Styling**: Tailwind CSS with 5 theme presets

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
phoenixv3/
├── app/
│   ├── api/              # REST API routes
│   ├── dashboard/        # Dashboard page
│   ├── agents/           # Agent management
│   ├── projects/         # Project management
│   ├── tasks/            # Task management (in progress)
│   ├── runs/             # Run history
│   ├── settings/         # Settings & backup
│   └── layout.tsx        # Root layout with Theme/Nav
├── lib/
│   ├── db/               # SQLite client & schema
│   ├── types/            # TypeScript domain types
│   ├── auth/             # API key generation & hashing
│   ├── webhooks/         # Webhook processor & cost tracking
│   ├── scheduler/        # Cron task scheduler
│   ├── retry/            # Retry policy engine
│   ├── recovery/         # Recovery snapshots
│   ├── cost/             # Cost calculation & aggregation
│   ├── skills/           # Skill registration & allocation
│   ├── logging/          # Structured logging system
│   ├── backup/           # Backup/restore functionality
│   ├── theme/            # Theme system & provider
│   └── plugins/          # Plugin templates (Telegram example)
├── components/
│   ├── Navigation.tsx    # Global nav
│   ├── ErrorBoundary.tsx # Error boundary
│   ├── agents/           # Agent components
│   ├── tasks/            # Task components
│   └── dashboard/        # Dashboard components
└── CLAUDE.md             # Project instructions
```

## API Routes

### Projects
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project with working directory

### Agents
- `GET /api/agents` — List agents
- `POST /api/agents` — Create agent with provider/model

### Tasks
- `GET /api/tasks?projectId=X` — List project tasks
- `POST /api/tasks` — Create task with optional schedule

### Runs
- `GET /api/runs?taskId=X` — List task runs
- `POST /api/runs` — Trigger manual run
- `GET /api/runs/:id` — Fetch run with snapshots
- `POST /api/runs/:id` — Resume or retry (with action param)

### Webhooks
- `POST /api/webhooks` — Receive agent status updates (Bearer token auth)

### Costs
- `GET /api/costs` — Total system cost
- `GET /api/costs?breakdown=provider` — Cost by provider
- `GET /api/costs?breakdown=agent` — Cost by agent
- `GET /api/costs?breakdown=project` — Cost by project
- `GET /api/costs?breakdown=trend` — 7-day cost trend

### Skills
- `GET /api/skills` — List all skills
- `GET /api/skills?agentId=X` — Skills for agent
- `POST /api/skills` — Register, allocate, or revoke

### Settings
- `GET /api/settings?action=backups` — List backups
- `GET /api/settings?action=logs` — Export logs
- `POST /api/settings` — Create backup, restore, set log level

### Providers
- `GET /api/providers` — List available providers

## Built-in Providers

1. **Claude Code** — Local Claude Code IDE
2. **Cursor** — Cursor AI IDE
3. **Pi** — Anthropic Pi
4. **OpenAI Compatible** — Any OpenAI-compatible endpoint
5. **Llama.cpp** — Local Llama.cpp (zero cost)

## Database Schema

### Core Tables
- `providers` — AI tool definitions
- `agents` — Agent instances (personality + provider binding)
- `projects` — Project outcomes
- `tasks` — Iterative steps with optional scheduling
- `runs` — Task executions
- `skills` — Provider-defined and custom skills
- `agent_skills` — Skill allocations
- `api_keys` — Agent authentication

### Supporting Tables
- `cost_logs` — Detailed cost tracking
- `webhooks` — Webhook delivery records
- `recovery_snapshots` — Recovery checkpoints
- `agent_skills` — Skill allocations

## File Structure: ~/.phoenix/

```
~/.phoenix/
├── phoenix.db                      # SQLite database
├── project-name/                   # Project working directory
│   ├── artifacts/                  # Task outputs
│   ├── logs/                       # Run logs
│   ├── .recovery/                  # Recovery snapshots
│   └── .config/                    # Project configuration
├── backups/                        # System backups (tar.gz)
│   ├── backup_*.tar.gz
│   └── backup_*.tar.gz.json        # Metadata
├── logs/                           # System logs
│   └── phoenix-YYYY-MM-DD.log      # Daily log files
├── skills/                         # Custom skill definitions
│   └── *.json                      # Skill JSON files
└── themes/                         # Custom themes (future)
```

## Configuration

### Environment Variables
- `NODE_ENV` — Development or production

### Settings Page
- Backup/restore management
- Log level configuration (DEBUG, INFO, WARN, ERROR)
- Feature status display

## Theme System

**Built-in Themes:**
1. `default-light` — Light theme with blue accents
2. `default-dark` — Dark theme with blue accents
3. `nord` — Nord color scheme
4. `dracula` — Dracula color scheme
5. `solarized` — Solarized colors

**Theme Modes:**
- `light` — Force light theme
- `dark` — Force dark theme
- `system` — Follow system preference (default)

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Running Tests
```bash
# Currently: manual testing only
# Run dev server and test UI at http://localhost:3000
npm run dev
```

### Building
```bash
npm run build
npm start
```

## Roadmap

### Phase 1 ✅ Foundation
SQLite schema, domain types, database client

### Phase 2 ✅ Agent Orchestration
Agent creation, webhooks, API keys, project management

### Phase 3 ✅ Task Execution
Scheduler, recovery, retry, task management

### Phase 4 ✅ Visibility
Dashboard, cost tracking, theme system, navigation

### Phase 5 ✅ Advanced Features
Skills, plugins, logging, backup/restore, settings

### Future Phases
- Multi-user support
- Cloud deployment
- Advanced monitoring (WebSocket real-time updates)
- Notification system enhancements
- Agent health checks & audit trail
- Mobile app

## Security Notes

- API keys are hashed with SHA-256 before storage
- Webhooks require valid API key in Authorization header
- No credentials stored in localStorage
- Recovery snapshots are local only
- Backups should be stored securely

## Contributing

This is a solo project. See CLAUDE.md for project guidelines.

## License

Proprietary — Phoenix v3 by Jon Stacy

## Support

For issues or questions, refer to GitHub: https://github.com/solarisjon/phoenixv3
