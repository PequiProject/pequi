#!/bin/bash
set -e

if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -tAc \
    "SELECT 1 FROM pg_database WHERE datname='pequi_test'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "CREATE DATABASE pequi_test;"
fi
