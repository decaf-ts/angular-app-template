# Design Principles

1. **Role-based access everywhere.** Every route declares its allowed `EPI`/`PLA` roles
   and namespaces; `canActivate`/`canActivateChild`/`plaOnly` guards resolve the signed-in
   account's roles before any page renders, and operation-level restrictions
   (`blockOperations`, e.g. leaflets block `update`, admin accounts block `create`/`delete`)
   are enforced at the route table, not ad hoc inside pages.
2. **Model-driven CRUD through decaf-ts.** Pages, layouts (`ProductLayout`, `BatchLayout`,
   `EpiLayout`) and forms (`BatchForm`, admin forms) are rendered through the decaf-ts
   for-angular engine over repositories backed by the Axios adapter, so create/read/update
   flows behave uniformly across products, batches, ePI documents, enrollments and accounts.
3. **Auditable actions.** Every persisted operation is traceable: the dedicated Audit page
   and `AuditHandler` expose the operation history, and recall status is a first-class
   state on both product and batch details.
4. **Configuration injected, never baked in.** All environment-specific values (PTP host,
   Keycloak, Kibana, blob limits) enter through the runtime-injected `assets/env.js`
   (`envsubst` over `env.sample.js` in the Dockerfile) and the `EWConfig` accumulation in
   `src/environments/environment.ts`; code literals are local fallbacks only, not cloud
   defaults (see [Environment](PTP_EW_05_9_Environment.md)).
5. **Responsive and offline-tolerant shell.** One responsive Ionic shell serves the
   desktop web layout (captured in the user manual), and the service worker
   (`ngsw-worker.js`) keeps cached assets alive between sessions in deployed mode.
6. **Testable assumptions.** Every page is covered twice: by the generated storyboard
   user guide (screenshots of every page and every option) and by the e2e suites in
   `e2e-tests/tests/ew/frontend/` and `e2e-tests/tests/ew-pla/frontend/`; the matrix in
   [Functional Requirements](PTP_EW_05_0_Functional_Requirements.md) maps each suite to
   the behavior it verifies so regressions are caught before release.
