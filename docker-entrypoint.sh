#!/bin/sh
# Un bind-mount sur /data appartient souvent à root (Coolify, docker run -v…) : l'utilisateur `nextjs`
# ne pourrait pas y écrire. On répare la propriété en root, puis on abandonne
# les privilèges avant de lancer le serveur.
set -e

DB="${BARDA_DB:-/data/barda.db}"
DIR=$(dirname "$DB")

mkdir -p "$DIR"
chown -R nextjs:nodejs "$DIR" 2>/dev/null || true

if ! su-exec nextjs test -w "$DIR"; then
  echo "barda: $DIR n'est pas accessible en écriture par nextjs — la base ne pourra pas s'ouvrir." >&2
  exit 1
fi

exec su-exec nextjs "$@"
