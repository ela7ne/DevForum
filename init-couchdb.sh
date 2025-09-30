#!/bin/bash
set -e

echo "Waiting for CouchDB to be ready..."
# Wait up to 30 seconds for CouchDB to start
timeout=30
while ! curl -s http://localhost:5984 >/dev/null; do
  sleep 1
  timeout=$((timeout-1))
  if [ $timeout -eq 0 ]; then
    echo "Timeout waiting for CouchDB"
    exit 1
  fi
done

echo "Creating system databases..."
for db in _users _replicator _global_changes; do
  if ! curl -s -f -X PUT http://admin:password@localhost:5984/$db >/dev/null; then
    echo "Failed to create $db database"
    exit 1
  fi
  echo "Created database: $db"
done

echo "CouchDB initialization complete!"