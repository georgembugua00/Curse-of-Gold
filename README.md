# Trading bots dashboard (Next.js on Vercel)

A read-only, password-protected phone dashboard for the trading bots.

- **Data:** the trading PC writes `snapshot.json` every 15 minutes (`scripts/dashboard_snapshot.py` in the trading project) and
  force-pushes it to this repo's `data` branch. The page fetches it from GitHub on each visit with a read-only token, so no redeploy is
  needed. `vercel.json` turns off deployments for the `data` branch.
- **Trimmed on purpose:** no logins, account numbers, ticket numbers, names or raw logs.
- **Login:** one password (`DASHBOARD_PASSWORD`), kept in a signed cookie for 30 days.

## Vercel environment variables

| Name | Value |
|---|---|
| `GITHUB_REPO` | `owner/repo` of this repository |
| `GITHUB_TOKEN` | fine-grained GitHub token: only this repository, **Contents: Read-only** |
| `DASHBOARD_PASSWORD` | the password you type on the login page |
| `SESSION_SECRET` | any long random text |

## Local test

```
set SNAPSHOT_FILE=..\reports\dashboard_snapshot\snapshot.json
npm install
npm run dev
```
