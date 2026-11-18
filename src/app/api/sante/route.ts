/** Sonde de santé du conteneur : ne dit rien d'autre que « le serveur répond ». */
export function GET() {
  return Response.json({ ok: true });
}
