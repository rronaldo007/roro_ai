#!/bin/sh
# wait-for-db.sh

set -e
  
host="$1"
port="$2"
shift 2
cmd="$@"

echo "⏳ Waiting for ${host}:${port}…"
  
until nc -z "$host" "$port"; do
  echo "Database $host:$port is unavailable - sleeping"
  sleep 1
done
  
echo "Database is up - executing command"
exec $cmd
