(function (window) {
  if (window["ENV"]) return;

  Object.defineProperty(window, "ENV", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: {},
  });

  const env = {
    app: "EW Frontend",
    env: "${ENV}",
    organization: "${ORG_NAME}",
    ptp: {
      host: "${PTP__HOST}",
      protocol: "${PTP__PROTOCOL}",
    },
    keycloak: {
      host: "${KEYCLOAK__HOST}",
      protocol: "${KEYCLOAK__HOST_PROTOCOL}",
      clientId: "${KEYCLOAK__CLIENT_ID}",
      realm: "${KEYCLOAK__REALM}",
      refreshThreshold: "${KEYCLOAK__REFRESH_THRESHOLD}",
    },
    kibana: {
      enabled: true,
      realm: "${KIBANA__REALM}",
      dashboard: "${KIBANA__DASHBOARD}",
      delay: "${KIBANA__DELAY}" || -1,
    },
    blobs: {
      maxSize: "${BLOBS__MAX_SIZE}" || 26214400,
    },
  };

  Object.entries(env).forEach(([key, val]) => {
    Object.defineProperty(window["ENV"], key, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: val,
    });
  });
})(this);
