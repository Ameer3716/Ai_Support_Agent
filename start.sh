#!/bin/sh
set -e

npm run init-db
npm run seed-demo

exec node server/index.js
