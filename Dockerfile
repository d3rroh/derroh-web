FROM golang:1.22-alpine AS build
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/main.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/contact-server .

FROM nginx:1.27-alpine-slim
COPY --from=build /out/contact-server /usr/local/bin/contact-server
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY index.html cv.html llms.txt sitemap.xml robots.txt site.webmanifest /usr/share/nginx/html/
COPY og-image.png /usr/share/nginx/html/
COPY favicon.ico favicon-16x16.png favicon-32x32.png favicon-48x48.png apple-touch-icon.png android-chrome-192x192.png android-chrome-512x512.png /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY blog/ /usr/share/nginx/html/blog/
COPY case-studies/ /usr/share/nginx/html/case-studies/

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
