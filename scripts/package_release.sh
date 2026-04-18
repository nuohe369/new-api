#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
RELEASE_ROOT="$ROOT_DIR/release"

TARGET_OS="${TARGET_OS:-linux}"
TARGET_ARCH="${TARGET_ARCH:-amd64}"
APP_NAME="${APP_NAME:-new-api}"

VERSION_FILE="$ROOT_DIR/VERSION"
RAW_VERSION=""
if [[ -f "$VERSION_FILE" ]]; then
  RAW_VERSION="$(tr -d '\r\n' < "$VERSION_FILE")"
fi
if [[ -z "$RAW_VERSION" ]]; then
  RAW_VERSION="$(date +%Y%m%d-%H%M%S)"
fi

PACKAGE_TAG="${1:-${RAW_VERSION}-${TARGET_OS}-${TARGET_ARCH}}"
PACKAGE_DIR="$RELEASE_ROOT/$PACKAGE_TAG"
ARCHIVE_PATH="$RELEASE_ROOT/${PACKAGE_TAG}.tar.gz"
BIN_PATH="$PACKAGE_DIR/$APP_NAME"

log() {
  printf '[package] %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

build_frontend() {
  log "building frontend"
  if command -v bun >/dev/null 2>&1; then
    (
      cd "$WEB_DIR"
      bun install
      DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION="$RAW_VERSION" bun run build
    )
    return
  fi

  if command -v npm >/dev/null 2>&1; then
    (
      cd "$WEB_DIR"
      npm install
      DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION="$RAW_VERSION" npm run build
    )
    return
  fi

  printf 'neither bun nor npm is available, cannot build frontend\n' >&2
  exit 1
}

build_backend() {
  log "building backend"
  require_cmd go
  (
    cd "$ROOT_DIR"
    GOOS="$TARGET_OS" GOARCH="$TARGET_ARCH" CGO_ENABLED=0 \
      go build \
      -ldflags "-s -w -X github.com/QuantumNous/new-api/common.Version=$RAW_VERSION" \
      -o "$BIN_PATH"
  )
}

write_metadata() {
  log "writing release metadata"
  cat > "$PACKAGE_DIR/README-package.txt" <<EOF
Package: $APP_NAME
Version: $RAW_VERSION
Target: $TARGET_OS/$TARGET_ARCH

Run:
  chmod +x ./$APP_NAME
  ./$APP_NAME

Notes:
  1. Frontend assets are already embedded into the binary.
  2. Default runtime working directory should be writable, for example /data or the current directory.
EOF

  printf '%s\n' "$RAW_VERSION" > "$PACKAGE_DIR/VERSION"

  cat > "$PACKAGE_DIR/run.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\$DIR"
chmod +x "./$APP_NAME"
exec "./$APP_NAME"
EOF
  chmod +x "$PACKAGE_DIR/run.sh"
  chmod +x "$BIN_PATH"
}

pack_release() {
  log "packing release archive"
  rm -f "$ARCHIVE_PATH"
  (
    cd "$RELEASE_ROOT"
    tar -czf "$ARCHIVE_PATH" "$PACKAGE_TAG"
  )
}

main() {
  require_cmd tar
  mkdir -p "$RELEASE_ROOT"
  rm -rf "$PACKAGE_DIR"
  mkdir -p "$PACKAGE_DIR"

  build_frontend
  build_backend
  write_metadata
  pack_release

  log "done"
  printf 'directory: %s\n' "$PACKAGE_DIR"
  printf 'archive:   %s\n' "$ARCHIVE_PATH"
}

main "$@"
