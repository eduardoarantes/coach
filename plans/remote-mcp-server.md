# Remote MCP Server Implementation Plan

**Status:** Implemented (Phases 1–4; chat-only and UI-coupled tools remain excluded)
**Target:** `https://app.coachwatts.com/mcp` in the Nuxt/Nitro monolith  
**Protocol baseline:** MCP `2025-06-18`  
**Related:** [OAuth Provider](../docs/02-features/oauth-provider.md), [Authentication](../docs/developer/authentication.md), [Tool Calling](../docs/02-features/chat/tool-calling-spec.md)

## 1. Outcome

Expose a deliberately selected subset of Coach Watts chat tools as a remote MCP server. A user should be able to add the URL to a supported client, authenticate with authorization code + PKCE, consent to explicit scopes, and call only the tools allowed by those scopes.

The first production release is read-only. Write and AI/async tools are separate releases and require their own safety review.

### Success measures

- A target client completes discovery and OAuth without a manually pasted client secret.
- `initialize`, `tools/list`, and selected read-only `tools/call` requests work end to end.
- Tokens issued for the developer API or another resource are rejected by `/mcp`.
- Tool visibility and execution both enforce the same manifest and scope policy.
- Calls are attributable to user, OAuth client, token, request, and tool, without storing sensitive results by default.
- Existing OAuth and REST API clients continue to work unchanged.

## 2. Decisions

| Topic         | Decision                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment    | Start in the Nuxt monolith; move only if the transport spike fails production constraints.                                                                       |
| Transport     | Streamable HTTP at `/mcp`; no legacy SSE endpoint unless a named launch client requires it.                                                                      |
| Session model | Prefer the SDK's stateless Streamable HTTP mode for v1. Do not add Redis or sticky sessions unless a required capability proves stateful sessions are necessary. |
| Tool source   | Reuse tool factories from `server/utils/ai-tools.ts`; do not duplicate business logic through REST wrappers.                                                     |
| Exposure      | One explicit manifest is the source of truth for name, phase, scopes, mutability, and quota operation. Default deny.                                             |
| Acting user   | Token owner only. No coach delegation or arbitrary athlete selection in v1/v2.                                                                                   |
| Approval      | OAuth consent authorizes a category of access; clients still control per-call confirmation. Write tools do not inherit the in-app `needsApproval` mechanism.     |
| Registration  | Support public OAuth clients with PKCE. DCR is a compatibility feature, not a trust signal. Decide its ownership and abuse policy before implementation.         |
| Audit data    | Persist metadata, hashes, status, timing, and a sanitized error code. Do not persist full arguments/results by default.                                          |

## 3. Current-state findings

- `getToolsWithContext()` builds tools from the existing factories and can return them without chat execution wrapping when no execution context is supplied.
- Chat execution already falls through to the underlying tool when `turnId` or `lineageId` is absent, but MCP should have its own audit/idempotency wrapper rather than depend on that behavior.
- Tools have feature-dependent availability (for example nutrition), so a manifest entry does not guarantee that a tool factory returns the tool for every user.
- `OAuthApp.ownerId` is required. Anonymous DCR therefore needs a defined system owner or a separate registration model; the draft cannot simply create an app.
- The current auth code and token models do not carry a resource. The resource must be bound at authorization, copied to the code, checked at token exchange, copied during refresh rotation, and checked at `/mcp`.
- Current public-client handling permits `plain` PKCE and does not require PKCE at authorization. MCP clients must require S256.
- Current consent handling accepts arbitrary scope strings. MCP work must introduce an allowlist and reject unknown or disallowed scopes.
- Several names in the previous draft did not match the registry. The phases below use current names.

## 4. Architecture

```text
MCP client
  -> POST/GET/DELETE /mcp
     -> MCP bearer authentication and audience check
     -> protocol/version/session handling
     -> manifest + scope filtering
     -> existing tool factory
     -> MCP execution wrapper
        -> rate/quota check
        -> audit + idempotency
        -> tool.execute()
     -> repositories/services/Trigger.dev

OAuth discovery
  -> protected-resource metadata
  -> authorization-server metadata
  -> public-client registration strategy
  -> authorize + consent (S256 PKCE, resource, allowed scopes)
  -> token + refresh rotation (resource-bound token)
```

## 5. Phase 0: feasibility and policy gates

Complete this phase before a migration or broad implementation.

### Transport spike

- Add the MCP SDK in a throwaway branch/spike and prove Nitro can pass `POST`, optional `GET`, and `DELETE` semantics and all SDK response headers.
- Verify `initialize`, `MCP-Protocol-Version`, JSON responses, optional SSE responses, cancellation, request timeout, and disconnect behavior.
- Verify the production proxy does not buffer or terminate required responses and that deployment replicas do not require in-memory session affinity.
- Choose stateless mode unless a launch requirement needs server notifications, resumability, or other session-bound behavior.
- Record the tested SDK version and its Node/Nitro adapter approach. Do not hand-roll MCP JSON-RPC framing.

### OAuth/security decisions

- Select the launch clients and test their registration behavior. Do not assume Cursor and Claude use identical OAuth flows.
- Choose one registration policy:
  1. pre-register named launch clients;
  2. DCR with strict metadata validation, per-IP/client limits, cleanup, and a system-owned registration identity; or
  3. a newer registration mechanism in a later protocol revision, only after deliberately changing the protocol baseline.
- If DCR ships, registered clients are public (`token_endpoint_auth_method=none`), untrusted, S256-only, and receive no scopes merely by registering.
- Define redirect URI policy: exact match; HTTPS except loopback; reject fragments, credentials, wildcard hosts, and non-loopback HTTP; cap URI count and metadata sizes.
- Confirm that `https://app.coachwatts.com/mcp` is the single canonical resource value, including normalization rules. Reject alternate path, query, fragment, and trailing-slash variants unless explicitly configured.

**Exit gate:** one target client completes an auth-only handshake in a production-like environment, and security signs off on registration policy.

## 6. Phase 1: OAuth resource-server compliance

### Discovery

Create:

- `server/routes/.well-known/oauth-protected-resource.get.ts`
- optionally the path-aware alias `server/routes/.well-known/oauth-protected-resource/mcp.get.ts` for client interoperability
- `server/routes/.well-known/oauth-authorization-server.get.ts`

Protected-resource metadata declares the exact `resource`, authorization server, and supported MCP scopes. Authorization-server metadata declares the issuer and actual `/api/oauth/*` endpoints, `S256`, supported grants, scopes, and registration endpoint only if the selected registration policy is implemented.

Unauthenticated `/mcp` requests return HTTP `401` with a `WWW-Authenticate: Bearer` challenge containing the protected-resource metadata URL. Authentication failures occur at HTTP level, not as a successful JSON-RPC tool result.

### Resource binding

Add `resource String?` to both `OAuthAuthCode` and `OAuthToken`. Keeping it nullable preserves existing REST OAuth tokens; `/mcp` accepts only the exact MCP resource.

Authorization flow requirements:

1. Validate `resource` before rendering consent.
2. Preserve it through GET authorize -> consent page -> POST authorize.
3. Require S256 PKCE for MCP resource requests.
4. Validate requested scopes against the MCP scope allowlist before consent and again on approval.
5. Store `resource` on the authorization code.
6. At token exchange, require the request resource to equal the code resource and issue a token with that resource.
7. On refresh, bind the replacement access/refresh token to the original resource and client; rotate the refresh token atomically and prevent reuse.
8. Return OAuth-standard errors and never redirect to an unvalidated URI.

Do not use `isMcpClient` or `isTrusted` as authorization. If registration provenance is useful operationally, store `registrationType`/metadata separately.

**Exit gate:** auth-only client test passes; a missing, mismatched, REST-only, expired, revoked, or deactivated-user token is rejected.

## 7. Phase 2: read-only MCP

### Manifest

Create `server/utils/mcp/tool-manifest.ts` as the only exposure policy. Each entry contains:

```ts
type McpToolPolicy = {
  name: string
  phase: 'read' | 'write' | 'async'
  scopes: string[]
  mutates: boolean
  quotaOperation?: string
  timeoutMs: number
}
```

At startup/test time, assert that:

- every manifest name exists in the registry for a representative fully enabled user;
- every entry has known scopes;
- every exposed mutating tool is marked `mutates`;
- temporarily disabled chat tools cannot be exposed;
- no registry tool is exposed implicitly.

`tools/list` intersects manifest policy, token scopes, and the tools actually returned for the user's settings. `tools/call` repeats all checks to prevent list/call time-of-check bypasses.

### Initial read-only catalog

Validate output sensitivity and response size for each tool before enabling it.

| Tool                          | Scope                                      |
| ----------------------------- | ------------------------------------------ |
| `get_recent_workouts`         | `workout:read`                             |
| `search_workouts`             | `workout:read`                             |
| `get_workout_details`         | `workout:read`                             |
| `get_workout_analysis`        | `workout:read`                             |
| `get_workout_streams`         | `workout:read`                             |
| `get_planned_workouts`        | `planning:read`                            |
| `search_planned_workouts`     | `planning:read`                            |
| `get_current_plan`            | `planning:read`                            |
| `get_planned_workout_details` | `planning:read`                            |
| `get_user_profile`            | `profile:read`                             |
| `get_sport_settings`          | `profile:read`                             |
| `get_training_availability`   | `planning:read`                            |
| `get_wellness_metrics`        | `health:read`                              |
| `get_nutrition_log`           | `nutrition:read`                           |
| `analyze_training_load`       | `analysis:read`                            |
| `forecast_training_load`      | `analysis:read`                            |
| `get_current_time`            | no data scope; always available after auth |
| `perform_calculation`         | no data scope; always available after auth |

Start with a smaller subset if response-size or privacy review is incomplete. In particular, workout streams and nutrition data deserve explicit payload and sensitivity review.

### Bridge and execution

Create:

```text
server/utils/mcp/
  auth.ts
  server.ts
  tool-manifest.ts
  tool-bridge.ts
  execution.ts
  errors.ts
  types.ts
```

Use the tool schema already exposed by the AI SDK where compatible; add a converter only if SDK integration tests demonstrate a mismatch. Normalize the two plain-object library tools only when they enter a release phase.

The execution wrapper must:

- derive user, client, token, scopes, and request ID from validated server context only;
- apply per-token and per-user limits before execution;
- enforce a per-tool timeout and maximum serialized result size;
- create a started audit record and finalize it in `finally`;
- map expected validation/authorization failures to safe MCP errors and redact internal failures;
- never pass the inbound MCP bearer token to downstream integrations.

Suggested audit model:

```prisma
model McpToolExecution {
  id          String   @id @default(uuid())
  userId      String
  appId       String
  tokenId     String?
  requestId   String
  toolName    String
  argsHash    String
  status      String
  errorCode   String?
  durationMs  Int?
  createdAt   DateTime @default(now())
  completedAt DateTime?

  @@index([userId, createdAt])
  @@index([appId, createdAt])
  @@index([requestId])
}
```

Avoid `result Json?` and raw `error String?` until retention, redaction, encryption, and access policies are defined.

**Exit gate:** a target client lists only authorized tools and successfully calls at least profile, workout, and planning reads; negative scope/audience tests pass.

## 8. Phase 3: write tools

Add write scopes only after v1 telemetry is stable. Candidate tools must be checked against the live registry and reviewed individually:

| Category     | Candidate tools                                                                                            | Scope                          |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Planning     | `create_planned_workout`, `update_planned_workout`, `reschedule_planned_workout`, `delete_planned_workout` | `planning:write`               |
| Workout      | `update_workout_notes`, `update_workout_tags`, `update_workout`                                            | `workout:write`                |
| Profile      | `update_user_profile`, `update_sport_settings`                                                             | `profile:write`                |
| Availability | `update_training_availability`                                                                             | `planning:write`               |
| Wellness     | `record_wellness_event`, `update_wellness_event`, `delete_wellness_event`                                  | `health:write`                 |
| Nutrition    | `log_nutrition_meal`, `log_hydration_intake`                                                               | `nutrition:write`              |
| Memory       | `list_memories`, `remember_memory`, `update_memory`, `forget_memory`                                       | `memory:read` / `memory:write` |

### Idempotency

Do not deduplicate solely by `(user, tool, argsHash, five-minute window)`; a user may intentionally repeat an identical action. Prefer a client/request idempotency key when available. Store a unique key scoped to token/client + tool, reserve it before execution, and return the stored completed response only for the same key. Define behavior for in-progress, failed, and expired keys.

High-impact tools such as `delete_workout`, bulk plan modification, publishing to external calendars, or tools with ambiguous replacement semantics require a separate product decision and are not part of the first write release.

**Exit gate:** each write tool has authorization, idempotency, replay, and failure-recovery tests plus explicit consent copy.

## 9. Phase 4: async and AI-cost tools

Consider `generate_planned_workout_structure`, `adjust_planned_workout`, `generate_report`, `sync_data`, library tools, and recommendation tools only after:

- temporarily disabled tools are re-enabled in the source registry;
- quota operations and subscription behavior are defined;
- queued results have a supported status/result retrieval mechanism (a bare `run_id` without a polling tool is insufficient);
- external side effects and Trigger.dev retry semantics are idempotent;
- tool descriptions and structured outputs clearly communicate queued vs completed work.

“Full parity” is not a goal by itself. Chat-only support, room-memory, coach-delegation, and UI-coupled tools may remain excluded permanently.

## 10. Scopes

Reuse existing scopes where their documented meaning matches. Add only:

- `planning:read`, `planning:write`
- `memory:read`, `memory:write`
- `analysis:read`, and later `analysis:write`
- `recommendations:read`
- later `ai:generate`

Do not treat `offline_access` as data authorization. It requests refresh-token behavior and must not make other scopes implicit. Consent must show exact requested scopes, client name, resource, and whether access can continue offline.

## 11. Test matrix

### Protocol and transport

- initialize/version negotiation and required `MCP-Protocol-Version` handling
- POST plus supported GET/DELETE behavior; content negotiation; invalid JSON-RPC; notifications
- stateless concurrent requests across replicas
- disconnect, timeout, cancellation, maximum body, and maximum result size

### OAuth

- discovery documents match deployed URLs
- exact redirect matching and malicious DCR metadata cases
- S256 required for MCP; code verifier, state, code expiry, and single-use code
- resource preserved across authorize, consent, code, token, and refresh
- wrong/missing resource, client mismatch, revoked/expired token, deactivated user
- unknown scope rejected; consented scope cannot be escalated at token or refresh
- refresh rotation is atomic and reuse is detected

### Tools

- manifest/registry drift test
- list and call enforce identical scope rules
- feature-disabled and temporarily disabled tools are absent
- arbitrary tool name and malformed input rejected
- ownership isolation: token owner cannot address another athlete through tool arguments
- write replay/idempotency and concurrent duplicate calls
- safe errors, audit completion on exceptions, rate limits, quota limits, payload limits

### Launch clients

Maintain a dated compatibility matrix for each named client: version, registration method, OAuth success, refresh, list, call, and reconnect. Include an SDK-driven smoke test in CI, but keep real-client tests as a release gate.

## 12. Delivery sequence

1. **Spike and decisions (3–5 days):** transport, deployment, launch clients, registration policy, canonical resource.
2. **OAuth foundation (1–2 weeks):** discovery, S256, scope validation, resource-bound code/token/refresh, auth-only interoperability.
3. **Read-only release (1–2 weeks):** MCP route, manifest, bridge, audit/rate limits, selected read tools, docs.
4. **Write release (2–3 weeks):** consent copy, idempotency, per-tool review and tests.
5. **Async/AI release (separate estimate):** only after status retrieval, quota, and retry designs are approved.

Estimates are planning ranges, not commitments; revise them after the Phase 0 spike.

## 13. Rollout and operations

- Put MCP behind a server-side feature flag and an OAuth client allowlist during internal testing.
- Roll out to internal accounts, then a small beta, then general availability.
- Dashboard: auth failure reason, calls by client/tool/status, p50/p95 duration, rate-limit hits, quota denials, payload-limit failures, and active DCR clients.
- Alerts: error-rate increase, auth audience failures, unusual registration volume, repeated refresh reuse, and costly tool spikes.
- Publish revocation instructions and let users see and revoke MCP client grants.
- Define a kill switch that disables tool execution while leaving discovery and revocation available.

## 14. Definition of done

- Production-like transport spike passed with at least one named launch client.
- OAuth resource and scope binding is covered through refresh rotation.
- Read-only catalog contains only verified current tool names and passes ownership/privacy review.
- Manifest is default-deny and enforced on both list and call.
- Audit, rate limits, quotas, payload limits, redaction, monitoring, revocation, and kill switch are operational.
- Connection, scope, privacy, troubleshooting, and revocation docs are published.
- Existing `/api/oauth/*` and developer API regression tests pass.
- Write and async phases are not considered done merely because read-only MCP ships.

## 15. References

- [MCP Authorization, protocol revision 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [RFC 8414 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 9728 — Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [RFC 7591 — Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 8707 — Resource Indicators](https://datatracker.ietf.org/doc/html/rfc8707)
- In repo: `docs/06-plans/oauth-provider-implementation.md`
- In repo: `server/utils/ai-tools.ts`
- In repo: `server/utils/chat/tool-execution.ts`
- In repo: `server/utils/auth-guard.ts`
