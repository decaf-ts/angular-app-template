# Functional Requirements

Requirements are grouped per page, matching the coverage of the generated
[User Manual](PTP_EW_06_User_Manual.md). Each requirement names the e2e suite that
validates it (under `e2e-tests/tests/ew/frontend/` for the MAH build and
`e2e-tests/tests/ew-pla/frontend/` for the PLA build) so the matrix doubles as a
regression map.

## Navigation and shell

* Authenticated pages share one shell: a top header with the application title,
  operation shortcuts and the account avatar, and a collapsible side menu whose entries
  are filtered by the signed-in account's roles and namespaces. Route-level operation
  restrictions (`blockOperations`) must hide or disable the corresponding actions.
  Validated by `PTP-569-navigation.e2e.ts`.

## Dashboard

* The dashboard is the post-login landing page and must render for any authenticated
  account, with the layout staying consistent across viewports of the responsive shell.
  Validated by `PTP-567-dashboard.e2e.ts` and `PTP-683-dashboard.e2e.ts`.

## Products

* The product list supports search/pagination and navigates to identity, recall and
  actions flows; creating a product walks identity → image and recall → strengths →
  markets → actions; details expose recall status and operation actions; update is a
  staged flow over the same fields. Validated by `PTP-535-product.e2e.ts` and the
  product sections of `PTP-571-crud-flows.e2e.ts`.

![Product list](./screenshots/ew-products-list.png)

## Batches

* Batches are created under a product through identity → import and packaging →
  manufacturing details → recall and actions; details expose recall status and actions;
  update re-enters the same field groups. Validated by `PTP-536-batch.e2e.ts` and the
  batch sections of `PTP-571-crud-flows.e2e.ts`.

## ePI documents

* The leaflets page lists ePI documents and allows creating one through
  classification → documents (external file upload bounded by `blobs.maxSize`) →
  actions; details expose preview and actions; the `update` operation is blocked at the
  route level by design. Validated by `PTP-537-leaflet.e2e.ts` and
  `PTP-1069-external-document.e2e.ts` / `PTP-1070-external-document.e2e.ts`.

## Audit logs

* The audit page lists the persisted operation history across the PLA namespace and must
  remain read-only. Validated by `PTP-570-audit.e2e.ts`.

## Tasks

* Tasks are a PLA-namespace page (`plaOnly`): the list and its operation flows are only
  reachable with PLA roles. Validated by `PTP-572-tasks.e2e.ts`.

## Administration (enrollments and accounts)

* Enrollments (PLA namespace) support listing and creating enrollment requests;
  accounts support reading and updating existing accounts, with `create`/`delete`
  blocked at the route level. Validated by the admin sections of
  `PTP-571-crud-flows.e2e.ts` and the navigation suite `PTP-569-navigation.e2e.ts`.

## Enrollment token

* The enrollment-token page (`plaOnly`) validates enrollment tokens and routes accepted
  users into the onboarding flow. Covered by the generated
  [User Manual](PTP_EW_06_User_Manual.md#enrollment-token) and the account suites
  (`PTP-568-account.e2e.ts`, `PTP-682-account.e2e.ts`).

## Account

* The account page shows the signed-in account's details and is reachable from the
  header avatar for any authenticated role. Validated by `PTP-568-account.e2e.ts` and
  `PTP-682-account.e2e.ts`.

## Errors and empty states

* The error page and the not-found route render dedicated states; list pages render an
  explicit empty state (e.g. `ew-batches-empty.png` in the user manual) instead of a
  blank table.

## Responsive layouts

* Every key page (sign-in, dashboard, lists, create flows, audit, enrollments) must hold
  the same behavior across viewports of the responsive web shell; the user manual
  captures the desktop web layout per page.

## Coverage matrix

| Page | User manual section | e2e suites |
| --- | --- | --- |
| Sign in / signed out | Getting started | `PTP-569-navigation.e2e.ts` |
| Dashboard | Getting started | `PTP-567-dashboard.e2e.ts`, `PTP-683-dashboard.e2e.ts` |
| AstraTrace | Getting started | storyboard (`ew-frontend.storyboard.ts`) |
| Account | Getting started | `PTP-568-account.e2e.ts`, `PTP-682-account.e2e.ts` |
| Products | Products | `PTP-535-product.e2e.ts`, `PTP-571-crud-flows.e2e.ts` |
| Batches | Batches | `PTP-536-batch.e2e.ts`, `PTP-571-crud-flows.e2e.ts` |
| ePI documents | ePI documents | `PTP-537-leaflet.e2e.ts`, `PTP-1069`/`PTP-1070-external-document.e2e.ts` |
| Audit logs | Audit logs | `PTP-570-audit.e2e.ts` |
| Tasks | Tasks | `PTP-572-tasks.e2e.ts` |
| Enrollments / Accounts | Administration | `PTP-571-crud-flows.e2e.ts`, `PTP-569-navigation.e2e.ts` |
| Enrollment token | Enrollment token | `PTP-568`/`PTP-682-account.e2e.ts` |
| Error / not found / empty | Errors and empty states | storyboard (`ew-frontend.storyboard.ts`) |
