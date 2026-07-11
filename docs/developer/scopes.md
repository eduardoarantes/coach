# Permission Scopes

When requesting authorization, you must specify which scopes your application needs.

## Available Scopes

| Scope             | Description                            | Resource Access               |
| :---------------- | :------------------------------------- | :---------------------------- |
| `profile:read`    | **Default.** Read public profile info. | Name, Email, Avatar, FTP      |
| `profile:write`   | Update profile settings.               | Update weight, FTP            |
| `workout:read`    | Read workout history.                  | List workouts, get details    |
| `workout:write`   | Manage workouts.                       | Upload, edit, delete workouts |
| `health:read`     | Read sensitive health metrics.         | HRV, Sleep, Recovery scores   |
| `health:write`    | Log health metrics.                    | Log HRV, sleep, weight        |
| `nutrition:read`  | Read nutrition logs.                   | Daily calories, macros        |
| `nutrition:write` | Log nutrition data.                    | Log calories, carbs, protein  |
| `offline_access`  | Long-lived access.                     | Returns a `refresh_token`     |

## MCP scopes

These scopes are used by the remote MCP server at `/mcp` (see [mcp-server.md](./mcp-server.md)):

| Scope                   | Description                                           |
| :---------------------- | :---------------------------------------------------- |
| `planning:read`         | Read planned workouts, availability, and current plan |
| `planning:write`        | Create and modify planned workouts                    |
| `analysis:read`         | Training load analysis and forecasts                  |
| `memory:read`           | List stored AI memories                               |
| `memory:write`          | Create, update, or forget memories                    |
| `recommendations:read`  | Read recommendations                                  |
| `recommendations:write` | Accept or dismiss recommendations                     |
| `ai:generate`           | Reserved for future async/AI tools                    |

MCP also reuses the profile, workout, health, and nutrition scopes above.

## Best Practices

- **Least Privilege:** Only request scopes you actually need.
- **Incremental Auth:** You can request additional scopes later if the user attempts a specific action.
