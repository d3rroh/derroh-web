FROM golang:1.22-alpine AS build
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/main.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/contact-server .

# Minify, version-stamp and pre-gzip the static site (scripts/build_assets.sh).
FROM node:20-alpine AS assets
WORKDIR /site
COPY index.html cv.html llms.txt sitemap.xml robots.txt site.webmanifest ./
COPY og-image.png favicon.ico favicon-16x16.png favicon-32x32.png favicon-48x48.png apple-touch-icon.png android-chrome-192x192.png android-chrome-512x512.png ./
COPY assets/ assets/
COPY blog/ blog/
COPY case-studies/ case-studies/
# GitHub stats from scripts/build_stats.py (directory may hold only .gitkeep)
COPY data/ data/
COPY scripts/build_assets.sh /usr/local/bin/build_assets.sh
RUN sh /usr/local/bin/build_assets.sh /site

FROM nginx:1.27-alpine-slim
COPY --from=build /out/contact-server /usr/local/bin/contact-server
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY --from=assets /site/ /usr/share/nginx/html/

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
