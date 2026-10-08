# Operator capacity console

Tracking: [h3-studio #71](https://github.com/apedintensor/h3-studio/issues/71).

## Integration boundaries

- Canonical React entry `/operator`; backend must serve this HTML route.
- Cookie session authorization remains server-owned. Sidebar discovery uses `/api/auth/me.operator_capacity.view`; the console checks `/v1/operator/capacity/state.operator.account` against the active account. No username is privileged in source. Ordinary API keys do not gain rental authority.
- `operator-client.js` reuses the same-origin application client, expected-account fence and cookie transport. There are no provider credentials or provider calls in the browser.
- State/catalog/offers are read projections. Start preview includes an explicit FL/REF mode, catalogue GPU model, allowed topology, node count and original TTL. Default filters are omitted so the server can resolve its trusted preset; preview returns effective filters. Custom filters require a matching server deployment and do not silently select a different recipe.
- Start, drain and stop persist their original account-bound idempotency key before submission. Uncertain responses retain the record; explicit recovery resends the same body/key. No automatic write retries, replacement rentals, force stop, budget resets or TTL extensions.
- Prices marked `approved_ceiling` are displayed as configured rate limits. Pending-start commitments may contribute to the aggregate. Preview reservation is not a bill. Missing or stale observations never become healthy zero-capacity assertions.

## Quick Chat compatibility

`deployment_profile_id` is optional and top-level in `next_settings`, card creation/revision and immutable revisions. Null means the existing routing. Explicit choices are preserved when editing, changing copy count, copying a card or continuing a previous revision. The composer saves its pending choice together with the next settings before creating a turn; historical revisions are unchanged.

Selected profiles use their own `generation_support[mode].controls` and constraints; legacy pool restrictions and deployment presets are not reused. Authored controls are preserved and backend preflight remains authoritative. Public profile metadata and isolated-runtime evidence never imply that a production adapter is configured or qualified.

`plan.execution.timing_hint` is shown only for `scope: historical_exact_case`, using the recorded case measurements. There is no interpolation or invented ETA; displayed task times include in-task loading but exclude rental, downloading and queueing.

## Validation and remaining boundary

- 303 offline frontend tests passed, including uncertain-operation recovery, account-change races, 403 clearing, no-storage refusal, same-origin request identity, explicit mode and profile-specific constraints.
- Vite production build passed into an ignored local output directory; existing large-chunk and dependency `use client` warnings remain.
- Chrome checked an explicitly labeled local fixture: desktop/mobile layout, profile-dependent GPU count, FL/REF selection, preview before confirmation, consent gate and operation receipt. The fixture has no provider or generation access.
- This commit is source integration only. No frontend publication, server enablement, real machine launch, provider inventory verification or end-to-end video generation was performed by these checks.
- The production backend must wire `/operator`, the owner capability map, catalogue, deployment bindings, policy and controller. Historical recipe records alone cannot authorize a launch.

Local fixture screenshots are intentionally not committed: `.operator-ui-check/console-desktop.jpg`, `start-preview.jpg`, `console-mobile.jpg`. They contain synthetic operational data and real catalogue labels, not live cloud status.

Safe-stop detail: a stale provider observation does not prohibit recording drain/stop intent when the freshly read server action allows it. Destruction still waits for the existing backend proof; the UI retains the observed node version. A historical confirmed destruction remains labeled destroyed rather than becoming healthy or running again.

## Real local API integration check — 2026-10-09

Chrome exercised `http://127.0.0.1:8897` using the root integration backend, `tools/run_operator_preview.py`, isolated SQLite/local-test authentication, and the rebuilt frontend through `05df48f`. This was an actual application API check, separate from the fixture above. Provider bindings, the capacity controller, assistant calls and video execution were disabled; no cloud resources were queried or launched.

- The server-recognized `superdan` owner could open the console and read the three real deployment catalogue profiles.
- A Base BF16 / REF / two-GPU preview returned configuration, disabled-policy and zero-capacity-limit blockers in Chinese. Unknown preview prices stayed “尚未核对”; confirm-start remained disabled.
- Quick Chat exposed the selected profile's REF controls, including 20/50 sampling-step options. Selecting Base BF16, saving next settings and creating a draft preserved the profile after browser reload, in the original card editor, and in a second card in the same conversation.
- The ordinary `supervan` account was denied direct console access, retained access to Quick Chat, and did not see its operator sidebar entry. The owner's isolated draft history was not shown to that account.
- No source correction was needed after this integration check. This does not qualify the cloud bootstrap, availability, billing, runtime execution, or production release.

Local evidence, intentionally not committed: `.operator-ui-check/real-api-blocked-preview.jpg`, `real-api-card-profile-restored.jpg`, `real-api-ordinary-denied.jpg`.
