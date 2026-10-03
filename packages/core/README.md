# @updf/core

Private, unreleased `2.0.0-poc.0`. Portable immutable declarative PDF data,
prepared fonts, native painting, VDOM and native JSX runtimes. Zero runtime
dependencies. See repository `docs/native-api.md` for contracts and limitations.
No example CMR types, React, parser or filesystem APIs are part of core.
`/measurement` exposes frozen plain/rich measurements; `RichTextNode` and native
`<richText>` use typed paragraphs/runs, with font/size/RGB styles. Components receive
operation-bound `context.measurement.measureText`. See repository
`docs/measurement.md`; #26 is locally implemented, audit pending, not released.
`/internal` is a narrow audited shared-validator seam, not a consumer extension API.

The current local foundation adds `/vdom` `createContext`/`useContext` with owned,
deeply readonly synchronous provider values. Core operations default to trusted
workloads; `profile: "service"`, frozen `SERVICE_LIMITS` and validated `limits`
offer optional budgets without weakening geometry/font/schema checks. See
`docs/architecture/composable-layout.md` for units, remaining optional parser caps
and the approved but not-yet-implemented layout blueprint. No page hooks/images
or public serializer plans are exposed. Independent foundation audit is pending.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB. No npm publication or deployment is authorized.
