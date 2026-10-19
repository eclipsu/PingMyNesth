# Builds either Go service from the same image definition:
#   docker build --build-arg SERVICE=api    -t pingthenest-api .
#   docker build --build-arg SERVICE=worker -t pingthenest-worker .
FROM golang:1.27-alpine AS build
ARG SERVICE=api
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/${SERVICE}

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
USER app
COPY --from=build /out/app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
