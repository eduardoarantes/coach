# Coach Watts MCP Server

Remote MCP endpoint: `{siteUrl}/mcp`

## Enable locally

MCP is enabled by default (read, write, and async tool phases). Set `NUXT_MCP_ENABLED=false` to disable the endpoint, or `NUXT_MCP_WRITE_ENABLED=false` / `NUXT_MCP_ASYNC_ENABLED=false` to turn off individual phases.

```bash
export NUXT_PUBLIC_SITE_URL=http://localhost:3099
```

Apply the migration:

```bash
pnpm db:deploy
```

Run MCP-focused unit tests:

```bash
pnpm test:mcp
```

## OAuth discovery

- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-protected-resource/mcp`

MCP clients must request authorization with:

- `resource={siteUrl}/mcp`
- PKCE `S256`
- Allowed scopes from [scopes.md](./scopes.md)

## Tool phases

| Flag                         | Default | Effect                                                                             |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `NUXT_MCP_READ_ENABLED`      | `true`  | Expose read tools                                                                  |
| `NUXT_MCP_WRITE_ENABLED`     | `true`  | Expose write tools                                                                 |
| `NUXT_MCP_ASYNC_ENABLED`     | `true`  | Expose async/AI tools (`generate_report`, `sync_data`, structure generation, etc.) |
| `NUXT_MCP_EXECUTION_ENABLED` | `true`  | Kill switch for tool execution                                                     |
| `NUXT_MCP_CLIENT_ALLOWLIST`  | empty   | Comma-separated OAuth client IDs                                                   |
| `NUXT_MCP_DCR_ENABLED`       | `true`  | Allow MCP clients to register via OAuth DCR                                        |

Write and async mutating tools support idempotency via the `Mcp-Idempotency-Key` request header.

## Async jobs

Async tools return identifiers such as `generation_run_id`, `report_id`, or `run_id`. Poll completion with the `get_async_job_status` tool:

```json
{
  "job_type": "structure_generation",
  "job_id": "<generation_run_id>"
}
```

Supported `job_type` values: `structure_generation`, `report`, `trigger_run`.

## Client registration

Dynamic client registration (DCR) is **enabled by default**. Cursor and other MCP clients can connect with only the MCP URL in `mcp.json`:

```json
{
  "mcpServers": {
    "coach-watts": {
      "url": "https://app.coachwatts.com/mcp"
    }
  }
}
```

When Cursor registers via `POST /api/oauth/register`, compatible redirect URIs reuse the shared **Cursor MCP** OAuth app instead of creating a new client each time.

DCR owner resolution order:

1. `NUXT_MCP_DCR_OWNER_USER_ID`
2. `NUXT_MCP_DCR_OWNER_EMAIL`
3. First admin user in the database

To disable DCR, set `NUXT_MCP_DCR_ENABLED=false`.

### Manual bootstrap (optional)

Pre-create the shared Cursor app explicitly:

```bash
pnpm cw:cli oauth create-cursor-mcp-app --owner-email you@example.com
pnpm cw:cli oauth create-cursor-mcp-app --owner-email you@example.com --prod
```

Static `auth.CLIENT_ID` in `mcp.json` is only needed when DCR is disabled.

## Operations

- Manifest drift is logged at startup when MCP is enabled (`server/plugins/mcp-manifest-validation.ts`).
- Admin dashboard data: `GET /api/admin/mcp/stats` (24h execution summary, latency p50/p95, error codes, DCR counts, in-process auth/rate-limit counters).
- Revoke MCP access any time from **Settings → Apps**.

## Troubleshooting

### 401 on `/mcp`

- Confirm the token was issued with `resource={siteUrl}/mcp` (REST developer tokens without a resource are rejected).
- Check token expiry and that the user account is active.
- Inspect the `WWW-Authenticate` challenge for the protected-resource metadata URL.

### OAuth authorization fails

- MCP clients must send PKCE with `code_challenge_method=S256`.
- Requested scopes must be in the MCP allowlist (`docs/developer/scopes.md`).
- Redirect URIs must match exactly (HTTPS required except loopback).

### Tool missing from `tools/list`

- Verify the tool phase flag (`NUXT_MCP_WRITE_ENABLED`, `NUXT_MCP_ASYNC_ENABLED`).
- Confirm the token includes the required scopes.
- Nutrition and feature-gated tools only appear when enabled for the user.
- Chat-disabled async tools (`sync_data`, `generate_report`) require the async phase flag.

### Async job stuck

- Call `get_async_job_status` with the id returned by the async tool.
- For structure generation use `job_type=structure_generation` and `generation_run_id`.
- For reports use `job_type=report` and `report_id`.
- For Trigger.dev-backed sync use `job_type=trigger_run` and `run_id`.

## Security notes

- MCP tokens are bound to the exact `/mcp` resource URL.
- REST developer API tokens without a resource cannot call `/mcp`.
- Refresh token rotation is enforced for MCP resource tokens; reuse revokes the grant chain.
