# Sixnine design sources

- Start at `SOURCE-README.md`, then the backend repository's `AGENTS.md`, `PROJECT-PLAN.md`, `WORKFLOW.md` and assigned issue. Keep one shared Project; GitHub content is English.
- Canonical source: `studio-app/`; approved Quick Chat UX: `quick-chat-mock/`. Do not edit the backend `yingxu/` snapshot directly or synchronize it without applicable frontend publication approval.
- Use a dedicated branch/worktree per concurrent session. Preserve other sessions' changes. Agents open, verify and merge authorized PRs; the user does not perform routine manual PR work.
- Work in related batches and run affected checks once at the end. Source preservation is distinct from UX acceptance, deployment and real generation verification.
- Backend, Worker and GPU lifecycle stay in `h3-studio`; do not duplicate their state machines in the browser.
- Keep credentials, connection codes, private prompts/media, caches and node_modules out of Git. Use the central AI Registry only for internal provider integration; external users do not require it.
- New sessions continue G1/G2 from the preserved implementation, not a fresh redesign. Missing service capability must be explicit to users.
