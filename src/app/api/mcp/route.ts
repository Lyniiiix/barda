import { NextResponse } from "next/server";
import { TOOL_LIST, callTool } from "@/lib/mcp";

export const dynamic = "force-dynamic";

/**
 * Serveur MCP (transport HTTP, JSON-RPC 2.0), sans état : chaque requête porte
 * son jeton, rien n'est gardé entre deux appels. C'est ce qui permet de le
 * servir depuis l'app elle-même plutôt que d'un processus local sur le Mac.
 */

const SERVER = { name: "barda", title: "Barda — inventaire", version: "1.0.0" };
const DEFAULT_PROTOCOL = "2025-06-18";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

function authorised(req: Request): boolean {
  const expected = process.env.BARDA_MCP_TOKEN;
  // Pas de jeton configuré = porte fermée, jamais ouverte.
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.replace(/^Bearer\s+/i, "").trim();
  return given.length > 0 && given === expected;
}

function handle(msg: Rpc): unknown {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: (params?.protocolVersion as string) || DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions:
          "Inventaire du matériel : des objets, rangés dans des lots (sacs, caisses), " +
          "rattachés à des projets. Commencer par `inventaire_apercu` pour situer le terrain. " +
          "Les codes I… désignent des objets, L… des lots, P… des projets. " +
          "Aucun outil ne supprime quoi que ce soit : le signaler plutôt que de contourner.",
      });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: TOOL_LIST });

    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      if (!name) return err(id, -32602, "nom d'outil manquant");
      try {
        const result = callTool(name, args);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          // Une erreur métier (code inconnu…) se signale ici, pas en erreur JSON-RPC.
          isError: typeof result === "object" && result !== null && "erreur" in result,
        });
      } catch (e) {
        return ok(id, {
          content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
          isError: true,
        });
      }
    }

    default:
      return err(id, -32601, `méthode inconnue : ${method}`);
  }
}

export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json(err(null, -32001, "jeton absent ou invalide"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "JSON illisible"), { status: 400 });
  }

  const messages: Rpc[] = Array.isArray(body) ? (body as Rpc[]) : [body as Rpc];
  const replies = messages
    .filter((msg) => msg && typeof msg === "object")
    // Une notification n'a pas d'id et n'attend pas de réponse.
    .filter((msg) => msg.id !== undefined && msg.id !== null)
    .map(handle);

  if (replies.length === 0) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? replies : replies[0]);
}

export async function GET() {
  return NextResponse.json(
    err(null, -32000, "Ce serveur ne diffuse pas d'événements : utiliser POST."),
    { status: 405 },
  );
}
