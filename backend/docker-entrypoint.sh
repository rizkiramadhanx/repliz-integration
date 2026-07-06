#!/bin/sh
set -e
# Ensure uploads dir exists and is writable by nestjs (for named volume)
mkdir -p /usr/src/app/uploads
chown -R nestjs:nodejs /usr/src/app/uploads
exec su-exec nestjs "$@"
