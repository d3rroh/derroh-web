FROM golang:1.27-alpine AS build
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/main.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/contact-server .

# Minify, version-stamp and pre-gzip the static site (scripts/build_assets.sh).
FROM node:24-alpine AS assets
WORKDIR /site
COPY index.html cv.html 404.html llms.txt sitemap.xml robots.txt site.webmanifest ./
COPY og-image.png favicon.ico favicon-16x16.png favicon-32x32.png favicon-48x48.png apple-touch-icon.png android-chrome-192x192.png android-chrome-512x512.png ./
COPY assets/ assets/
COPY blog/ blog/
COPY case-studies/ case-studies/
# GitHub stats from scripts/build_stats.py (directory may hold only .gitkeep)
COPY data/ data/
COPY scripts/build_assets.sh /usr/local/bin/build_assets.sh
RUN sh /usr/local/bin/build_assets.sh /site
# Fail the build if an inline script or handler isn't allowed by the CSP.
COPY nginx-security-headers.conf scripts/check_csp.js /tmp/
RUN node /tmp/check_csp.js /tmp/nginx-security-headers.conf /site

FROM nginx:1.30-alpine-slim
# Pick up Alpine security fixes released since the base image was built.
# su-exec runs the contact server as its own unprivileged user.
RUN apk upgrade --no-cache \
 && apk add --no-cache su-exec \
 && addgroup -S contact \
 && adduser -S -D -H -G contact -s /sbin/nologin contact \
 && install -o contact -g contact -m 640 /dev/null /var/log/contact-messages.log
COPY --from=build /out/contact-server /usr/local/bin/contact-server
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY --from=assets /site/ /usr/share/nginx/html/

EXPOSE 80
# Goes through nginx, so it covers both processes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/api/csrf-token || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
