# Environment

The EW frontend receives its configuration at container start: the container entrypoint
substitutes the sample environment file into `assets/env.js`, and the app accumulates
`window.ENV` into the `EWConfig` used by the runtime environment module. The variable
tables below are the authoritative consumed set for the frontend.

Only **real cloud-deployment defaults** (the frontend Helm chart) are quoted here. Defaults
hard-coded in the runtime environment module are local fallbacks and are marked as such — they
are not cloud defaults.

## Deployed configuration (covered)

| Variable                  | `window.ENV` path   | Cloud default | Description                                |
|---------------------------|---------------------|---------------|--------------------------------------------|
| `ENV`                     | `env`               | `""`          | Runtime environment name.                  |
| `PTP__HOST`               | `ptp.host`          | `""`          | EW backend host used by the Axios adapter. |
| `PTP__PROTOCOL`           | `ptp.protocol`      | `"https"`     | Protocol used for the EW backend.          |
| `KEYCLOAK__HOST`          | `keycloak.host`     | `""`          | Keycloak host for the SSO flow.            |
| `KEYCLOAK__HOST_PROTOCOL` | `keycloak.protocol` | `"https"`     | Keycloak protocol.                         |
| `KEYCLOAK__CLIENT_ID`     | `keycloak.clientId` | `""`          | Keycloak client id.                        |
| `KEYCLOAK__REALM`         | `keycloak.realm`    | `""`          | Keycloak realm.                            |
| `KIBANA__REALM`           | `kibana.realm`      | `""`          | Kibana realm for AstraTrace.               |
| `KIBANA__DASHBOARD`       | `kibana.dashboard`  | `""`          | Kibana dashboard embedded by AstraTrace.   |

## Consumed but not surfaced in deployment (gaps)

These variables are consumed by the runtime but absent from the Helm chart, so in cloud
they silently fall back to the local literal in the runtime environment module.

| Variable                      | `window.ENV` path           | Local fallback (not a cloud default) | Description                                        |
|-------------------------------|-----------------------------|--------------------------------------|----------------------------------------------------|
| `ORG_NAME`                    | `organization`              | `""`                                 | Organization name shown by the shell.              |
| `KEYCLOAK__REFRESH_THRESHOLD` | `keycloak.refreshThreshold` | `60`                                 | Token-refresh threshold (seconds).                 |
| `KIBANA__DELAY`               | `kibana.delay`              | `-1`                                 | Kibana dashboard load delay (`-1` = disabled).     |
| `BLOBS__MAX_SIZE`             | `blobs.maxSize`             | `26214400`                           | Maximum external-file/blob size in bytes (~25 MB). |

## Deploy-only (set by compose/Helm, not consumed)

| Variable | Cloud default         | Note                                                                                                  |
|----------|-----------------------|-------------------------------------------------------------------------------------------------------|
| `APP`    | `"Enterprise Wallet"` | Chart/compose key; the shipped sample config hardcodes `app: "EW Frontend"` and ignores the variable. |
| `LEVEL`  | `"INFO"`              | Chart/compose key; the log level is hard-coded (`LogLevel.debug`) in the runtime environment module.  |

## Code literals

| Value                   | Where                 | Description                                            |
|-------------------------|-----------------------|--------------------------------------------------------|
| `kibana.enabled = true` | shipped sample config | Kibana wiring is always enabled in the shipped config. |

## Configuration flow

![EW Frontend environment configuration flow](PTP_EW_05_9_Environment.puml)

The diagram is authored as PlantUML inside this folder and can be rendered with the
repository's puml-to-image pipeline.
