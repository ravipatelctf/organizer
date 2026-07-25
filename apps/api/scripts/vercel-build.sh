#!/bin/sh
set -e

prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  prisma migrate deploy
fi

nest build
