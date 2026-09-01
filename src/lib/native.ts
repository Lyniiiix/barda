/**
 * Pont vers la coquille iOS (`barda-ios`). Absent dans un navigateur ordinaire :
 * tout le code appelant doit rester fonctionnel sans lui.
 */

type Reply = { ok: boolean; message: string };

declare global {
  interface Window {
    __bardaNative?: boolean;
    __bardaReply?: (id: string, ok: boolean, message: string) => void;
    webkit?: { messageHandlers?: Record<string, { postMessage: (m: unknown) => void }> };
  }
}

const pending = new Map<string, (r: Reply) => void>();

export function hasNativePrinter(): boolean {
  return (
    typeof window !== "undefined" &&
    window.__bardaNative === true &&
    !!window.webkit?.messageHandlers?.barda
  );
}

function installReplyHook() {
  if (window.__bardaReply) return;
  window.__bardaReply = (id, ok, message) => {
    const resolve = pending.get(id);
    pending.delete(id);
    resolve?.({ ok, message });
  };
}

export function nativeCall(payload: Record<string, unknown>, timeoutMs = 180_000): Promise<Reply> {
  if (!hasNativePrinter()) return Promise.resolve({ ok: false, message: "pont natif absent" });
  installReplyHook();

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise<Reply>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, message: "l'application n'a pas répondu" });
    }, timeoutMs);

    pending.set(id, (r) => { clearTimeout(timer); resolve(r); });
    window.webkit!.messageHandlers!.barda.postMessage({ ...payload, id });
  });
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
