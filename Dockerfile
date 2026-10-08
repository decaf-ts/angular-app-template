ARG NODE_VERSION=24.16.0

FROM node:${NODE_VERSION:-24} AS builder

WORKDIR /usr/local/app

COPY ./ /usr/local/app/

RUN --mount=type=secret,id=TOKEN \
    NPM_TOKEN=$(cat /run/secrets/TOKEN) npm ci && \
    if [ "$ENV" = "production" ] || [ "$ENV" = "validation" ]; then npm run build:prod; else npm run build; fi

FROM nginx:stable-alpine3.23-slim AS runtime

RUN apk update && apk upgrade --no-cache

COPY --from=builder /usr/local/app/www /usr/share/nginx/html
COPY --from=builder /usr/local/app/www/assets/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

VOLUME /usr/share/nginx/html/assets/

CMD ["/bin/sh",  "-c",  "envsubst < /usr/share/nginx/html/assets/env.sample.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]

#CMD ["/bin/sh",  "-c",  "exec nginx -g 'daemon off;'"]

LABEL name="Angular-app-template" description="Angular-app-template"
