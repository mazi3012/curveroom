#!/bin/bash
# wait-for-it.sh
# Wait for a service to be ready before continuing (bash-only version)

set -e

host="$1"
shift

cmd="$@"

host_addr=$(echo "$host" | cut -d: -f1)
host_port=$(echo "$host" | cut -d: -f2)

echo "Waiting for PostgreSQL at $host:$host_port..."

until (echo > /dev/tcp/$host_addr/$host_port) 2>/dev/null; do
    echo "Waiting for PostgreSQL... (host=$host_addr port=$host_port)"
    sleep 2
done

echo "PostgreSQL is ready!"
exec $cmd