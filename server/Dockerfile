# Le contexte de build est la RACINE du dépôt, pas ce dossier : le serveur
# importe le moteur du jeu (`engine/`) et `data/network.json` pour recalculer la
# grille d'une date exactement comme la SPA. On conserve donc l'arborescence du
# dépôt dans l'image, et on se place dans server/.

FROM node:22-bookworm-slim
ENV NODE_ENV=production
RUN npm i -g pnpm@10.26.1

WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml server/.npmrc ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY server/ ./
COPY engine/ /app/engine/
COPY data/network.json /app/data/network.json

EXPOSE 3000
CMD ["pnpm", "start"]
