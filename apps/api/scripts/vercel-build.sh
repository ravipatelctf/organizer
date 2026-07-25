#!/bin/sh
set -e

# nest build's tsc needs @repo/permissions' dist/ on disk — turbo handles this ordering for
# `yarn build` at the repo root, but Vercel invokes this script directly, bypassing turbo.
yarn workspace @repo/permissions run build

prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  prisma migrate deploy
fi

nest build
