/**
 * Client for the MakeCode editor-extension postMessage protocol
 * (`pxtpkgext`). This is a small, promise-based rewrite of the plumbing
 * shipped with Microsoft's pxt-react-extension-template (MIT).
 *
 * Docs: https://makecode.com/extensions/extensions
 */

export interface ReadResponse {
  code?: string;
  json?: string;
  jres?: string;
  asm?: string;
}

export type ExtensionEvent =
  | "init"
  | "loaded"
  | "shown"
  | "hidden"
  | "datastream";

type Listener = (payload?: unknown) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

const STORAGE_PREFIX = "pxt-tutorial-author";

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws: we are embedded.
    return true;
  }
}

/**
 * When the proxy can't talk to the editor (e.g. running `npm run dev` in a
 * normal browser tab), reads/writes fall back to localStorage so the UI can
 * still be exercised.
 */
export class EditorExtensionClient {
  private readonly hosted: boolean;
  private readonly extId: string | undefined;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly listeners = new Map<ExtensionEvent, Set<Listener>>();
  private readonly ready: Promise<string | undefined>;

  constructor() {
    this.hosted = inIframe();
    this.extId = this.hosted ? window.location.hash.substring(1) : undefined;

    window.addEventListener("message", this.handleMessage);

    this.ready = this.hosted
      ? new Promise<string | undefined>((resolve) => {
          let settled = false;
          const settle = (target?: unknown) => {
            if (settled) return;
            settled = true;
            resolve(typeof target === "string" ? target : undefined);
          };

          this.on("init", settle);
          this.request("extinit")
            .then((resp) => settle(resp))
            .catch(() => settle(undefined));
          // Safety net: never block the UI forever if the editor stays silent.
          window.setTimeout(() => settle(undefined), 5000);
        })
      : Promise.resolve(undefined);
  }

  get isHosted(): boolean {
    return this.hosted;
  }

  /** Resolves with the editor target (e.g. "microbit") once initialized. */
  whenReady(): Promise<string | undefined> {
    return this.ready;
  }

  on(event: ExtensionEvent, listener: Listener): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
  }

  off(event: ExtensionEvent, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /** Reads the extension's own sidecar `[name].ts` / `[name].json` files. */
  async readCode(): Promise<ReadResponse> {
    if (!this.hosted) {
      return {
        code: localStorage.getItem(`${STORAGE_PREFIX}:code`) ?? undefined,
        json: localStorage.getItem(`${STORAGE_PREFIX}:json`) ?? undefined,
      };
    }
    const resp = await this.request("extreadcode");
    return (resp as ReadResponse) ?? {};
  }

  /** Reads every file in the user's project (main.ts, main.blocks, ...). */
  async readUserCode(): Promise<Record<string, string>> {
    if (!this.hosted) return {};
    const resp = await this.request("extusercode");
    return (resp as Record<string, string>) ?? {};
  }

  /** Writes the extension's own sidecar files. */
  async writeCode(body: { code?: string; json?: string }): Promise<void> {
    if (!this.hosted) {
      if (body.code !== undefined) {
        localStorage.setItem(`${STORAGE_PREFIX}:code`, body.code);
      }
      if (body.json !== undefined) {
        localStorage.setItem(`${STORAGE_PREFIX}:json`, body.json);
      }
      return;
    }
    await this.request("extwritecode", body);
  }

  private emit(event: ExtensionEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  private handleMessage = (event: MessageEvent): void => {
    const msg = event.data;
    if (!msg || msg.type !== "pxtpkgext") return;

    // Response to one of our requests.
    if (msg.id && this.pending.has(msg.id)) {
      const request = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      if (msg.error) request.reject(new Error(String(msg.error)));
      else request.resolve(msg.resp);
      return;
    }

    // Unsolicited lifecycle events from the editor.
    switch (msg.event) {
      case "extinit":
        this.emit("init", msg.target);
        break;
      case "extloaded":
        this.emit("loaded", msg.target);
        break;
      case "extshown":
        this.emit("shown", msg.target);
        break;
      case "exthidden":
        this.emit("hidden", msg.target);
        break;
      case "extdatastream":
        this.emit("datastream", true);
        break;
      default:
        break;
    }
  };

  private request(action: string, body?: unknown): Promise<unknown> {
    if (!this.hosted) {
      return Promise.reject(new Error("Not running inside the MakeCode editor"));
    }

    const id = `${action}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      window.parent.postMessage(
        {
          id,
          type: "pxtpkgext",
          action,
          extId: this.extId,
          response: true,
          ...(body !== undefined ? { body } : {}),
        },
        "*",
      );
    });
  }
}
