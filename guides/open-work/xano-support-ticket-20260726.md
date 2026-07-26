# Xano support ticket — draft (2026-07-26)

Instance: `xh2o-yths-38lt.n7c.xano.io` · workspace 3 (`OrbiterV2`) · branch `v1`

## Issue 1 — workflow test runner returns SQL Error while the instance is healthy

`workflow_test run` fails for **every** test id with:

```
HTTP 500  {"code":"ERROR_FATAL","message":"SQL Error: HY000"}
```

Also seen as `SQL Error: 7`. Reproduced on ids 87, 89, 90, 92, 93, 96, 107 — so it is not
test-specific.

Critically, this fails **while every other endpoint on the instance returns 200** in the
same window: the Metadata API, unauthenticated query endpoints, and table content search all
respond normally. `workflow_test list` also works — only `run` fails.

Impact: the entire deterministic preflight suite is unavailable, which is the safety net used
before spending a sandbox wipe on a 20-minute enrichment run.

## Issue 2 — instance intermittently loses its database (~50 minutes, 2026-07-25 19:05-20:00 UTC)

Symptoms, cycling roughly every few minutes:

- Unauthenticated endpoints: `{"code":"ERROR_FATAL","message":"SQL Error: HY000"}` / `SQL Error: 7`, HTTP 500
- Authenticated Metadata API: `401 Invalid token` **on a valid token** — the auth lookup
  appears to hit the same failed database
- Instance root: **200** throughout, so the runtime was up and only the DB layer was failing
- One self-recovery around 19:11-19:12, then sustained failure; 12 of 12 samples failed
  between 19:14:54 and 19:19:00; recovered around 19:33, broke again 19:41-19:42

`status.xano.com` reported "fully operational" for the whole window, presumably because the
instance answers on 443. A single-tenant DB failure does not appear to be covered by that
monitoring.

Two notes that may help diagnosis:

- The SQL error code **differed between requests** (`HY000` vs `7`), which suggests
  connection-pool exhaustion or a flapping backend rather than one clean hard failure.
- The `401`-on-valid-token behaviour is worth flagging in its own right: it makes a DB outage
  indistinguishable from an expired token for anyone debugging from the client side.
