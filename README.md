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

## Imprimer depuis l'iPhone

Safari **n'expose pas le Bluetooth** aux pages web (Web Bluetooth : Chrome, Edge, Opera, pas
Safari ni Firefox). Deux chemins, au choix :

1. **Bluefy** (App Store) — un navigateur qui implémente Web Bluetooth. Ouvrir Barda dedans :
   le bouton « Imprimer (Bluetooth) » apparaît et parle directement à la D11s. Rien à installer
   côté serveur.
2. **La file d'impression** — le bouton « File d'impression » range le PNG côté serveur ; sur
   le Mac, `npm run spool` le récupère et le dépose dans `~/MCP/fichero-printer/queue`, que
   `spooler.sh` envoie à l'imprimante.

```bash
BARDA_URL=https://barda.example.com BARDA_PRINT_TOKEN=… npm run spool
```

Le protocole BLE vient de [`fichero-printer`](https://github.com/0xmh/fichero-printer)
(`src/lib/fichero/`, copié tel quel, sans dépendance).

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
| `BARDA_PRINT_TOKEN` | jeton du spooler (en-tête `x-barda-token`) |

Base **SQLite** par `node:sqlite` (intégré à Node ≥ 22) — aucune dépendance native, aucun ORM,
le schéma est en haut de `src/lib/db.ts` et se crée tout seul au démarrage.

## Déploiement (Coolify)

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
