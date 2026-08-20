# Setup — flyctl on Windows, to run the dbt/dlt side from here

Written 2026-08-19, Mac-side session. Purpose: let this session do dbt/pipeline
work directly, not just PBI work, without needing Python/dbt/dlt installed
locally at all.

## Why this works without installing the whole toolchain

The ERP's MariaDB is firewalled to one specific IP: the static egress IP of
the `wijngalerij-pipeline` Fly.io app. That's a constraint on which *machine
on the network* the ERP sees, not on which Claude Code session is driving —
so the working pattern all session on the Mac side has been **`fly deploy`
(ship code) + `fly ssh console` (run it on that container)**, never running
dbt/dlt locally. That pattern is pure `flyctl`, fully cross-platform. Neon
itself is directly reachable from Windows already (confirmed in your own
handoff — the PBI model connects to it), so nothing else is needed either.

## Status on the Windows side (verified 2026-08-19)

Steps 1-4 are **done**. Verified from this machine:

- flyctl `v0.4.85 windows/arm64` installed via winget. The package id in the
  step below was originally wrong (`Fly.Flyctl` does not exist); the real one
  is **`Fly-io.flyctl`**.
- `fly auth whoami` -> `sa.timmers@gmail.com`, already logged in.
- `fly status -a wijngalerij-pipeline` -> two machines in `fra`, one `started`,
  one `stopped` standby. Exactly as predicted.
- The dbt repo is cloned at **`C:\Analytics`**, branch `dev`, clean, at
  `origin/dev`. `C:\PBI` is a **separate repo** — see "Two repos, not one" below.
- No local Python — as intended; all dbt/dlt runs go through `fly ssh console`.

**PATH caveat.** winget put the exe at
`%LOCALAPPDATA%\Microsoft\WinGet\Packages\Fly-io.flyctl_...\flyctl.exe` and added
that directory to the *user* PATH, but any shell started before the install still
carries the old PATH — so bare `flyctl` fails with "command not found" even though
it is installed. Restarting Claude Code is not enough; the **terminal** Claude Code
runs in must be restarted, since that process holds the stale environment. This
matters beyond convenience: the rules in `.claude/settings.local.json` are written
against bare `flyctl ...`, so an absolute-path invocation is not allowlisted and
gets blocked.

## 1. Install flyctl

Either:

```powershell
winget install --id=Fly-io.flyctl --exact
```

or the official install script:

```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

If neither works as-is, check `https://fly.io/docs/flyctl/install/` — not
verified from this side since it's a Windows-only step.

## 2. Authenticate

```
fly auth login
```

Interactive — opens a browser / gives a device code, same shape as the
`gh auth login` dance from earlier today. Needs to be the account with access
to the `wijngalerij-pipeline` app (ask if you don't have it).

## 3. Verify

```
fly status -a wijngalerij-pipeline
```

Should show two machines in `fra` (Frankfurt), one `started`, one `stopped`
(standby). If this works, everything below works.

## 4. Clone the dbt repo

```
git clone https://github.com/WijngalerijAutomation/Analytics.git --branch dev
```

(Or add as a remote to wherever you're already working.) `dev` is the working
branch — `main` is 39 commits behind, not where active work happens. Convention
carried over from the Neon side: `dev`/`main` git branches parallel `dev`/`main`
Neon branches.

## 5. The actual workflow

**Edit** dbt models under `dbt/wijngalerij/models/`, or the ingestion code
under `ingestion/`, same as any local repo.

**Ship a code change:**
```
fly deploy --config fly.pipeline.toml --dockerfile Dockerfile.pipeline -a wijngalerij-pipeline
```

**Run dbt** (against `dev` — always test here first, `dev` is the Neon branch
destructive/experimental runs belong on):
```
fly ssh console -a wijngalerij-pipeline -C "python scripts/dbt_env.py --target dev build"
```
Narrow to specific models with `--select model_name+` (the `+` pulls in
downstream dependents too — useful, since most marts chain off each other).

**TRAP: `fly ssh console` runs the DEPLOYED IMAGE, not your working tree.** Edit
a dbt model locally, run it on the box without deploying, and dbt silently builds
the OLD version — it even reports success. The tell: a new model is simply absent
from the selection ("1 of 1" where you expected 2), and in the deploy output the
`COPY dbt/` layer says CACHED when nothing shipped. Sequence is always: commit →
`fly deploy` → build. This cost a phantom-successful build on 2026-08-20.

Same against `prod` once verified on `dev`:
```
fly ssh console -a wijngalerij-pipeline -C "python scripts/dbt_env.py --target prod build"
```

**Run the ERP pipeline** (the dlt extraction — this is the step that
specifically needs the Fly container's IP):
```
fly ssh console -a wijngalerij-pipeline -C "python -m ingestion.pipeline_db --target dev"
```

No `.env` needed anywhere in this flow — every credential (`NEON_LOADER_URL`,
`NEON_TRANSFORMER_URL`, `ERP_DB_URL`, etc.) is already a Fly secret on the
deployed app. `fly secrets list -a wijngalerij-pipeline` shows what's set,
never the values themselves.

## Things worth knowing before running anything destructive

- **`dev` is copy-on-write and near-free on Neon — `prod` is not.** Test
  there first, always, per `CLAUDE.md`'s own branching convention.
- **The scraper's stock-page parsing has been broken since ~2026-08-11**
  (returns NULL for `voorraad` on every run) — unrelated to any of today's
  work, not yet fixed, still live. Don't be surprised by it.
- **dbt build failing loudly is usually correct, not a bug to work around** —
  the project's own philosophy (see `CLAUDE.md`) is that a failing test is the
  thing standing between bad data and the dashboard.
- If you touch `ingestion/source_db.py`'s `TABLES` list or add a new ERP table,
  redeploy before running the pipeline — the container needs the new code.


## Git — two repos, not one (changed 2026-08-19)

Until today both working trees pointed at **one** remote, `Analytics.git`:
the dbt project on `dev`/`main`, and the whole Power BI project parked on
`master` as an **orphan branch with zero shared ancestry**. Disjoint trees,
one blast radius, two agents pushing. Now split:

| Tree | Remote | Branch |
|---|---|---|
| `C:\Analytics` | `WijngalerijAutomation/Analytics` | `dev` (working), `main` |
| `C:\PBI` | `WijngalerijAutomation/PowerBI` | `master` |

Verified after the split: the new repo has the identical HEAD **and tree sha**
as the old `master` (`c93f6f7` / tree `3a973f3`, 83 commits), so nothing was
lost. `C:\PBI`'s stale `origin/dev` and `origin/main` refs were pruned — a
`git checkout dev` there now fails, which is the point.

**Still outstanding:** `master` is deliberately left in place on `Analytics.git`
as the rollback. Delete it only once the new repo has proven itself, and tell
the Mac session first — it is the shared remote changing underneath it.
Worth adding branch protection on `Analytics.git`'s `dev`/`main` at the same
time; that is what actually blocks a `--mirror` or a stray force-push.

Normal hygiene still applies within each repo — pull before you start, push
when you're done, don't leave both sessions editing the same files uncommitted.
Nothing enforces that automatically.
