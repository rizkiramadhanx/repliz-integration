#!/bin/sh
set -e
# Ensure uploads dir exists and is writable by nestjs (for named volume)
mkdir -p /usr/src/app/uploads
chown -R pwuser:pwuser /usr/src/app/uploads

# Jalankan migration TypeORM yang belum diterapkan setiap kali container start.
# Panggil cli.js langsung (bukan lewat node_modules/.bin/typeorm) karena
# `npm ci --omit=dev` tidak selalu membuat symlink bin untuk package ini —
# node_modules/typeorm/cli.js sendiri selalu ada karena typeorm ada di
# dependencies biasa (bukan devDependencies). TIDAK butuh ts-node/typescript.
gosu pwuser node node_modules/typeorm/cli.js migration:run -d dist/config/typeorm.config.js

exec gosu pwuser "$@"
