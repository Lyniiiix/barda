/**
 * Mode démo (`BARDA_DEMO=1`) : une instance publique, ouverte sans mot de passe, sur
 * des données fictives, et en lecture seule. Le verrou est dans le middleware : toute
 * requête qui écrit (formulaire, action serveur, envoi de fichier) y est refusée avant
 * d'atteindre le code. Rien ici ne dépend de la bonne volonté d'un bouton désactivé.
 */
export const DEMO = process.env.BARDA_DEMO === "1";

export const REPO_URL = "https://github.com/Lyniiiix/barda";
