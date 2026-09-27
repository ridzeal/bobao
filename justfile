# BOBAO — task runner
# Requires: just (https://github.com/casey/just)

# Default: list recipes
default:
    @just --list

# Start dev server on port 4000 with hot reload
dev:
    -fuser -k 4000/tcp
    npm run dev -- --port 4000

# Build for production
build:
    npm run build

# Run production server on port 4000
start:
    npm run start -- --port 4000

# Type-check
typecheck:
    npx tsc --noEmit
