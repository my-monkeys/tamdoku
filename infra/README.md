# tamdoku-stats — instance Convex self-host

Backend des stats « qui tape quoi » (originalité réelle). Isolé des autres
instances Convex de cookie-server (ultra-note, vigie, monkey).

## Mise en place sur cookie-server

```bash
# 1. Déposer ce dossier
mkdir -p /home/maxim/tamdoku-stats && cp -r infra /home/maxim/tamdoku-stats/

# 2. Config
cd /home/maxim/tamdoku-stats/infra
cp .env.example .env
sed -i "s/__openssl_rand_hex_32__/$(openssl rand -hex 32)/" .env

# 3. Démarrer
docker compose up -d
docker compose logs -f backend    # attendre "Convex backend ... ready"
```

## Exposition publique (t-api.my-monkey.fr)

1. **Caddy** — ajouter dans `/home/maxim/caddy/Caddyfile` :
   ```
   http://t-api.my-monkey.fr {
       reverse_proxy tamdoku-convex-backend:3211
   }
   ```
   puis recharger Caddy.

2. **cloudflared** — ajouter dans `/etc/cloudflared-monkey/config.yml`, avant le
   `service: http_status:404` final :
   ```yaml
     - hostname: t-api.my-monkey.fr
       service: http://localhost:80
   ```
   puis `sudo systemctl restart cloudflared-monkey`.

3. **DNS Cloudflare** (zone my-monkey.fr) — CNAME
   `t-api` → `d6564364-044b-470b-8055-0abf4d140b56.cfargotunnel.com` (proxied).

## Déployer les functions (depuis un checkout du repo tamdoku)

```bash
export CONVEX_SELF_HOSTED_URL="http://127.0.0.1:3240"
export CONVEX_SELF_HOSTED_ADMIN_KEY="$(docker exec tamdoku-convex-backend \
  ./generate_admin_key.sh | tail -1)"
npx convex deploy   # génère convex/_generated/ et pousse schema + functions + crons
```

## Vérifs

```bash
curl -s https://t-api.my-monkey.fr/popularity | jq .          # { updatedAt, stationFame, day }
curl -s -X POST https://t-api.my-monkey.fr/submit \
  -H 'content-type: application/json' \
  -d '{"date":"2026-07-07","anon":"probe-0001","cells":[{"cell":0,"station":"comedie"}]}'
```
