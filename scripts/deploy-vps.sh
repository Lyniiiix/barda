#!/bin/sh
# ⚠️ OBSOLÈTE depuis le 02/09/2026 : l'application est passée sous Coolify.
# Lancer ce script recrée un conteneur concurrent qui réclame le même domaine
# que celui de Coolify — deux routeurs Traefik sur le même Host(). C'est arrivé.
#
# Déployer maintenant = bouton « Deploy » dans Coolify, ou un push sur `main`
# si le déploiement automatique est activé.
#
# Conservé uniquement comme filet si Coolify tombe : ./scripts/deploy-vps.sh --secours
#
# Construit l'image sur le VPS à partir d'une archive de HEAD, puis remplace le
# conteneur. Les secrets (/opt/barda/barda.env) et les données (/opt/barda/data)
# ne sont jamais touchés.
set -e

if [ "$1" != "--secours" ]; then
  echo "Refus : Coolify gère désormais le déploiement de Barda."
  echo "Utilise le bouton « Deploy » dans Coolify, ou pousse sur main."
  echo "Pour forcer malgré tout (Coolify en panne) : $0 --secours"
  echo "⚠️ Supprime d'abord le conteneur Coolify, sinon les deux se disputeront le domaine."
  exit 1
fi

HOST="${BARDA_HOST:-root@vps.example.com}"
DOMAIN="${BARDA_DOMAIN:-barda.example.com}"
TAG="barda:$(git rev-parse --short HEAD)"

echo "→ envoi de $(git rev-parse --short HEAD) vers $HOST"
git archive --format=tar.gz -o /tmp/barda-src.tgz HEAD
scp -q /tmp/barda-src.tgz "$HOST:/tmp/"

ssh "$HOST" "set -e
rm -rf /tmp/barda-build && mkdir -p /tmp/barda-build
tar xzf /tmp/barda-src.tgz -C /tmp/barda-build
cd /tmp/barda-build && docker build -q -t '$TAG' . >/dev/null
echo '→ image $TAG construite'

docker rm -f barda >/dev/null 2>&1 || true
docker run -d --name barda --restart unless-stopped --network coolify \
  --env-file /opt/barda/barda.env -v /opt/barda/data:/data \
  --label traefik.enable=true \
  --label 'traefik.http.routers.http-barda.entryPoints=http' \
  --label 'traefik.http.routers.http-barda.rule=Host(\`$DOMAIN\`) && PathPrefix(\`/\`)' \
  --label 'traefik.http.routers.http-barda.middlewares=redirect-to-https' \
  --label 'traefik.http.routers.http-barda.service=http-barda' \
  --label 'traefik.http.services.http-barda.loadbalancer.server.port=3000' \
  --label 'traefik.http.routers.https-barda.entryPoints=https' \
  --label 'traefik.http.routers.https-barda.rule=Host(\`$DOMAIN\`) && PathPrefix(\`/\`)' \
  --label 'traefik.http.routers.https-barda.middlewares=gzip' \
  --label 'traefik.http.routers.https-barda.service=https-barda' \
  --label 'traefik.http.routers.https-barda.tls=true' \
  --label 'traefik.http.routers.https-barda.tls.certresolver=letsencrypt' \
  --label 'traefik.http.services.https-barda.loadbalancer.server.port=3000' \
  '$TAG' >/dev/null

# On ne garde que les trois dernières images, le disque du VPS n'est pas extensible.
docker images barda --format '{{.Repository}}:{{.Tag}}' | tail -n +4 | xargs -r docker rmi >/dev/null 2>&1 || true
rm -rf /tmp/barda-build /tmp/barda-src.tgz"

printf '→ attente du démarrage'
i=0
while [ $i -lt 20 ]; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/login" || true)
  if [ "$code" = "200" ]; then echo " ✓ https://$DOMAIN répond"; exit 0; fi
  printf '.'; sleep 2; i=$((i + 1))
done
echo " ✗ pas de réponse — ssh $HOST 'docker logs barda'"
exit 1
