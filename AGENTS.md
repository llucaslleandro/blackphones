## Vendly — Agent Guidance (Quick)

This repo is a **static CDN web app** (storefront + dashboard) backed by a **Google Apps Script** JSON API (`Code.gs`) that reads/writes Google Sheets (`Produtos`, `Pedidos`).

### Golden rules
- Keep the app **bundler-free** (no Node build step assumed). Everything must work via plain `<script>` tags.
- Preserve **script load order** in `index.html` and `dashboard/*.html` (globals depend on it).
- Do **not** introduce secrets into the repo. Treat `config.js` as public.
- Apps Script API must keep response shape: `{ ok: boolean, data?: any, error?: string }`.

### Key paths
- Storefront: `index.html`, `css/styles.css`, `js/*.js`, `config.js`
- Dashboard: `dashboard/index.html`, `dashboard/dashboard.html`, `dashboard/app.js`
- Backend: `Code.gs`

### Where rules live
- Main rules entry: `.cursor/rules/main.mdc`
- Quick commands/patterns: `.cursor/quick-reference.mdc`
