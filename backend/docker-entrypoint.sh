#!/bin/sh
set -e
# Ensure uploads dir exists and is writable by nestjs (for named volume)
mkdir -p /usr/src/app/uploads
chown -R pwuser:pwuser /usr/src/app/uploads

# Jalankan migration TypeORM yang belum diterapkan setiap kali container start.
# Pakai binary `typeorm` CLI murni (bukan typeorm-ts-node-commonjs) terhadap
# dist/config/typeorm.config.js — TIDAK butuh ts-node/typescript, karena
# devDependencies sengaja tidak ikut ke image production (npm ci --omit=dev).
gosu pwuser node_modules/.bin/typeorm migration:run -d dist/config/typeorm.config.js

exec gosu pwuser "$@"
