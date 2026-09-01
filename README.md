# Barda — inventaire du matériel

Ce que j'ai, dans quel sac, et pour quel projet. Conçu pour être utilisé **à une main sur un
iPhone**, en scannant des étiquettes QR imprimées sur la Fichero D11s.

## Le modèle

Trois objets, et c'est tout :

| | Code | À quoi ça sert |
|---|---|---|
| **Objet** | `I…` | Une chose. Un fer à souder, un disque dur, un rouleau de gaine, une trousse de secours. Nom, description libre, quantité + unité, catégorie, état. |
| **Lot** | `L…` | *Où* c'est rangé : un sac, une caisse, un tiroir. Nommé « Lot 1 », « Lot 2 »… par défaut. Un objet est dans zéro ou un lot. |
| **Projet** | `P…` | *À quoi* ça sert : « Voiture enfant », « Support CAN ». Un objet peut servir à plusieurs projets. |

La fiche d'un projet répond à la seule question qui compte au moment de charger la voiture :
**quels lots embarquer**.

Chaque objet et chaque lot porte un code court à 6 caractères (`IR7MCX`, `LGJWAQ`) — l'alphabet
exclut `I`, `L`, `O` et `U`, illisibles sur une étiquette de 12 mm.

## Étiquettes

Le QR encode `https://<hôte>/s/<code>`, donc **l'appareil photo natif de l'iPhone ouvre la fiche**
sans passer par l'app. Le scanner intégré (`/scan`) sert à autre chose :

- **Consulter** — scan → la fiche s'ouvre ;
- **Ranger** — on choisit un lot cible, puis on scanne les objets à la chaîne : chacun est
  rangé dans le lot sans quitter la caméra. Scanner l'étiquette d'un *lot* change la cible.

Un code-barres de fabricant inconnu propose de créer l'objet avec ce code ; scanné à nouveau
plus tard, il retrouve la fiche.

Si un QR ne se lit pas une fois imprimé, le bouton **QR code seul** réduit le contenu au code
nu (`IR7MCX`) : le QR devient beaucoup moins dense, mais l'appareil photo natif n'ouvre plus
la fiche. **Sens A / Sens B** retourne l'étiquette de 180° si elle sort à l'envers.

## Imprimer — qui peut, et comment

Safari **n'expose pas le Bluetooth** aux pages web, et ne le fera pas — ni sur iPhone, ni sur
Mac (Web Bluetooth : Chrome, Edge, Opera ; pas Safari, pas Firefox). D'où trois chemins, que la
page choisit toute seule :

| Contexte | Chemin | Ce qu'il faut |
|---|---|---|
| App iOS [`barda-ios`](../barda-ios) | pont natif → CoreBluetooth | l'app installée |
| Chrome / Edge, sur Mac ou Android | Web Bluetooth | rien |
| Safari, ou n'importe quoi d'autre | file d'impression → relais Mac | `npm run spool` qui tourne |

`hasNativePrinter()` (`src/lib/native.ts`) arbitre entre les deux premiers ; le bouton
« File d'impression » reste toujours affiché en secours. **Bluefy** (navigateur Web Bluetooth de
l'App Store) reste une quatrième voie sur iPhone, si l'app native n'est pas installée.

Le relais imprime lui-même via la CLI `fichero` — un seul terminal à laisser ouvert :

```bash
BARDA_URL=https://barda.example.com BARDA_PRINT_TOKEN=… npm run spool
```

⚠️ **Depuis Terminal.app**, pas depuis launchd : macOS n'accorde le Bluetooth qu'aux processus
dont le parent y a droit. `--queue-only` se contente de déposer les PNG dans
`~/MCP/fichero-printer/queue`, pour l'ancien `spooler.sh`.

Le protocole BLE vient de [`fichero-printer`](https://github.com/0xmh/fichero-printer) :
`src/lib/fichero/` côté web (copié tel quel, sans dépendance), et porté en Swift dans l'app iOS.

## Le serveur MCP

`POST /api/mcp` — un serveur MCP (JSON-RPC, transport HTTP, sans état) servi par l'app
elle-même, pour que Claude puisse consulter et tenir l'inventaire. Il vit avec les données :
rien à lancer sur le Mac, et il reste joignable de n'importe où.

```bash
claude mcp add --transport http barda https://barda.example.com/api/mcp \
  --header "Authorization: Bearer $BARDA_MCP_TOKEN"
```

Douze outils, en français comme le reste :

| | |
|---|---|
| `inventaire_apercu` | vue d'ensemble — totaux, lots, projets, ce qui cloche. Le point d'entrée. |
| `objets_chercher` · `objet_lire` | recherche et détail |
| `lots_lister` · `projets_lister` | les contenants et les usages |
| `projet_besoins` | ce qu'il faut pour un projet, **groupé par lot** — donc quoi embarquer |
| `objet_ajouter` · `objet_modifier` | création et modification partielle |
| `objet_ranger` · `stock_ajuster` | changer de lot, décompter un consommable |
| `lot_creer` · `projet_creer` | nouveaux contenants et projets |

**Aucun outil ne supprime.** Un modèle peut se tromper de code, et un objet effacé ne se
retrouve pas ; les suppressions restent à faire dans l'interface.

Sans `BARDA_MCP_TOKEN` défini, le point d'accès **refuse tout** — il ne s'ouvre jamais par
défaut. Les écritures passent par `src/lib/mutations.ts`, exactement le même code que les
formulaires de l'app : pas de seconde définition de « modifier un objet » qui pourrait diverger.

## Développement

```bash
npm install
npm run dev     # http://localhost:3210
```

`.env.local` :

| Variable | Rôle |
|---|---|
| `BARDA_PASSWORD` | mot de passe unique d'accès |
| `BARDA_SECRET` | clé HMAC du cookie de session (1 an) |
| `BARDA_DB` | chemin du fichier SQLite |
| `BARDA_PRINT_TOKEN` | jeton du relais d'impression (en-tête `x-barda-token`) |
| `BARDA_MCP_TOKEN` | jeton du serveur MCP (en-tête `Authorization: Bearer …`) |

Base **SQLite** par `node:sqlite` (intégré à Node ≥ 22) — aucune dépendance native, aucun ORM,
le schéma est en haut de `src/lib/db.ts` et se crée tout seul au démarrage.

## Déploiement

En production sur **https://barda.example.com** — conteneur posé à la main sur le VPS, derrière le
Traefik existant. Redéployer :

```bash
./scripts/deploy-vps.sh
```

Reconstruit l'image sur le VPS depuis `HEAD` et remplace le conteneur, sans toucher aux secrets
(`/opt/barda/barda.env`) ni aux données (`/opt/barda/data`).

### Reprise par Coolify

Comme `tools` : projet Coolify, source GitHub, `Dockerfile`, push sur `main` → redéploiement.

- **Volume persistant obligatoire** : `/data` (la base y vit). Sans lui, tout disparaît au
  prochain déploiement.
- Le repo doit être **ajouté explicitement** à l'installation de la GitHub App (elle est en
  « selected repositories »), sinon le clone échoue.
- DNS : rien à faire, le A wildcard `*.example.com` couvre le sous-domaine.
- Pas de Cloudflare Access : une redirection de login casserait l'usage caméra en intervention.
  La protection est le mot de passe + le cookie signé, et le site est en `noindex`.

## Sauvegarde

`Réglages ▸ Exporter en JSON` sort tout (objets, lots, projets, liens). C'est **la seule copie
lisible** : à garder ailleurs, et à intégrer à la chaîne `age` → un stockage distant comme le reste.
