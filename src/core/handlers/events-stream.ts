// OWNER: CORE · SSE: decision | settlement | budget | approval + heartbeat · API_DOCS 5.7
import { subscribe } from "@/core/audit/events";

const HEARTBEAT_MS = 15_000;

/** Server-Sent Events, so this one endpoint does not use the JSON envelope — there is no JSON body. */
export const GET = async (request: Request): Promise<Response> => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The client went away mid-write; cleanup below handles it.
        }
      };

      send("ready", { at: new Date().toISOString() });

      const unsubscribe = subscribe((event, data) => send(event, data));
      // Proxies drop an idle stream, so the connection has to prove it is still alive.
      const heartbeat = setInterval(() => send("heartbeat", { at: new Date().toISOString() }), HEARTBEAT_MS);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
