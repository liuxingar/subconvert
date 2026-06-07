# Implementation Notes

## Scope

This Docker-local build now covers the non-admin user flow:

- Public config generator.
- Subscription URL import through the server.
- YAML, Base64 subscription, and node-link parsing.
- Built-in templates and template library.
- YAML generation, visual preview, and download.
- Local user login.
- Persistent subscription link creation.
- Dynamic `/sub/{token}` YAML rendering.
- Subscription dashboard with copy/delete/logout.
- FAQ, guide, and bug-feedback article categories backed by SQLite.

The following modules are intentionally scaffolded rather than complete:

- OAuth login.
- AI assistant.
- Scheduled background refresh.
- User-created template publishing/review.
- Full admin CRUD.

## Smoke Test

After `docker compose up --build`, open `http://localhost:3000` and test:

1. Paste this YAML into the YAML source:

   ```yaml
   proxies:
     - name: Test-SS
       type: ss
       server: 127.0.0.1
       port: 8388
       cipher: aes-128-gcm
       password: test123
   ```

2. Click `生成配置`.
3. Confirm the preview shows `1` node, proxy groups, and a `Test-SS` node.
4. Switch to `YAML` preview.
5. Click `下载配置`.
6. Visit `/templates`, search `精简`, and click `使用`.
7. Visit `/faq`, switch between `常见问题`, `使用指南`, and `Bug反馈`.
8. Visit `/login`, tick the terms checkbox, and log in as local user with password from `LOCAL_USER_PASSWORD` (default `local`).
9. Return to `/`, click `生成订阅链接`, then copy or delete it from `/dashboard`.
10. Open the generated `/sub/{token}` URL and confirm it returns `text/yaml`.

## SQLite

The database file is stored at:

```text
./data/subboost.db
```

The app automatically creates tables and seeds templates/FAQ data on first access.

## Security Notes

The `/api/fetch-subscription` endpoint includes a basic SSRF guard:

- HTTP/HTTPS only.
- Blocks localhost and private IP ranges.
- Rejects redirects.
- Limits response size to 2MB.
- Times out requests after 12 seconds.

For production use, extend this guard with stricter DNS rebinding protection, request auditing, and deployment-network egress rules.

## Local Windows Note

The app uses Node's built-in `node:sqlite` module, so local Windows testing does not require native npm compilation for SQLite. Use Node 22.5+ or Node 24+.
