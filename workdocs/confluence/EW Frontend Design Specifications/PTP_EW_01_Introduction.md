# Introduction

The Enterprise Wallet (EW) frontend is the authenticated web consumer of the
PharmaLedger Product Traceability Platform (PTP). It is implemented as a standalone
Ionic/Angular application and acts as the authoring and audit surface over the
Enterprise Wallet backend.

Its primary responsibility is to let Marketing Authorisation Holder (MAH) and
PharmaLedger Association (PLA) users manage medicinal product data end to end:
products, batches, electronic product information (ePI) documents, audit trails,
operational tasks, enrollments and accounts. Access is role-based throughout: the `PLA`
roles (`pla-admin`, `pla-reader`, `pla-writer`) and the `EPI` roles
(`epi-admin`, `epi-reader`, `epi-writer`) govern which sections a signed-in account can
reach, enforced by the routing guards described in [Architecture](PTP_EW_03_Architecture.md).

The application talks to the backend exclusively through the decaf-ts Axios adapter
(`DecafAxiosHttpAdapter`) pointed at the PTP host/protocol injected at container start,
authenticates through Keycloak single sign-on, and surfaces operational analytics
through the embedded Kibana dashboard (AstraTrace).

This specification focuses on the UI patterns, role model, environment configuration, and
verification strategy that keep the experience reliable:

* Configuration and deployment details are captured in [Environment](PTP_EW_05_9_Environment.md).
* Feature-level expectations are tied to the frontend end-to-end suites and to the generated
  [User Manual](PTP_EW_06_User_Manual.md), ensuring every page and every option within a
  page is validated and documented.
