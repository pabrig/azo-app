import { Client } from "appwrite";
import { CHAMP_ID, config } from "../config";
import { cloudPayload, cloudView, syncFingerprint } from "../domain/cloud";
import type { ChampionshipState } from "../domain/types";
import type { SyncMode } from "../domain/types";

type CloudRow = { sailors?: unknown; events?: unknown };

export type CloudSync = {
  init: () => Promise<void>;
  push: () => Promise<void>;
  schedule: () => void;
  markApplying: (value: boolean) => void;
  isReady: () => boolean;
  dispose: () => void;
};

class AppwriteRequestError extends Error {
  code?: number;
  type?: string;
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: number; type?: string };
  return record.code === 404 || String(record.type || "").includes("not_found");
}

export function createCloudSync(options: {
  getState: () => ChampionshipState;
  applyRemote: (row: unknown) => void;
  onStatus: (mode: SyncMode, label: string) => void;
}): CloudSync {
  let ready = false;
  let connecting = false;
  let applying = false;
  let pushAfterApply = false;
  let disposed = false;
  let timer = 0;
  let unsubscribe = () => {};

  async function request(method: string, path: string, body?: unknown) {
    const response = await fetch(`${config.appwriteEndpoint}${path}`, {
      method,
      headers: {
        "X-Appwrite-Project": config.appwriteProjectId,
        "Content-Type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: number;
      type?: string;
    };
    if (!response.ok) {
      const error = new AppwriteRequestError(json.message || response.statusText);
      error.code = json.code || response.status;
      error.type = json.type;
      throw error;
    }
    return json as CloudRow;
  }

  function rowPath(id?: string) {
    const base = `/tablesdb/${config.appwriteDatabaseId}/tables/${config.appwriteTableId}/rows`;
    return id ? `${base}/${id}` : base;
  }

  let pushing: Promise<void> | null = null;
  let pushAgain = false;

  async function push() {
    if (!ready || disposed) return;
    if (pushing) {
      pushAgain = true;
      return pushing;
    }
    pushing = (async () => {
      do {
        pushAgain = false;
        await writeMerged();
      } while (pushAgain && !disposed);
    })().finally(() => {
      pushing = null;
    });
    return pushing;
  }

  /** Une con la última versión de la nube antes de escribir, para no pisar a otro celular. */
  async function writeMerged() {
    try {
      const latest = await request("GET", rowPath(CHAMP_ID));
      if (disposed) return;
      options.applyRemote(latest);
      if (syncFingerprint(options.getState()) === syncFingerprint(cloudView(latest))) {
        options.onStatus("live", "Appwrite");
        return;
      }
    } catch (error) {
      if (!isNotFound(error)) {
        console.warn(error);
        if (!disposed) options.onStatus("error", "Sin nube");
        return;
      }
    }
    const data = cloudPayload(options.getState());
    try {
      await request("PATCH", rowPath(CHAMP_ID), { data });
      if (!disposed) options.onStatus("live", "Appwrite");
    } catch (error) {
      if (isNotFound(error)) {
        try {
          await request("POST", rowPath(), {
            rowId: CHAMP_ID,
            data,
            permissions: ['read("any")', 'update("any")', 'delete("any")']
          });
          if (!disposed) options.onStatus("live", "Appwrite");
          return;
        } catch (createError) {
          console.warn(createError);
        }
      }
      console.warn(error);
      if (!disposed) options.onStatus("error", "Sin nube");
    }
  }

  function schedule() {
    if (disposed) return;
    if (applying) {
      pushAfterApply = true;
      return;
    }
    if (!ready) {
      if (!connecting && navigator.onLine && config.appwriteProjectId) void init();
      return;
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      void push();
    }, 400);
  }

  function flush() {
    if (!timer || disposed) return;
    window.clearTimeout(timer);
    timer = 0;
    void push();
  }

  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);

  function absorb(row: unknown) {
    options.applyRemote(row);
    if (!disposed && syncFingerprint(options.getState()) !== syncFingerprint(cloudView(row))) {
      schedule();
    }
  }

  function subscribe() {
    try {
      const client = new Client().setEndpoint(config.appwriteEndpoint).setProject(config.appwriteProjectId);
      const channel = `databases.${config.appwriteDatabaseId}.tables.${config.appwriteTableId}.rows.${CHAMP_ID}`;
      unsubscribe = client.subscribe(channel, (message) => {
        const payload = message.payload;
        if (payload) absorb(payload);
      });
    } catch (error) {
      console.warn(error);
    }
  }

  async function init() {
    if (connecting || disposed) return;
    if (!config.appwriteProjectId || !config.appwriteDatabaseId) {
      options.onStatus("local", "Solo celular");
      return;
    }
    connecting = true;
    try {
      const row = await request("GET", rowPath(CHAMP_ID));
      if (disposed) return;
      ready = true;
      options.applyRemote(row);
      if (!disposed && syncFingerprint(options.getState()) !== syncFingerprint(cloudView(row))) {
        await push();
      }
      if (!disposed) options.onStatus("live", "Appwrite");
    } catch (error) {
      if (disposed) return;
      if (isNotFound(error)) {
        ready = true;
        await push();
      } else {
        console.warn(error);
        options.onStatus("error", "Sin señal");
      }
    } finally {
      connecting = false;
    }
    if (ready && !disposed) subscribe();
  }

  return {
    init,
    push,
    schedule,
    markApplying(value: boolean) {
      applying = value;
      if (!value && pushAfterApply) {
        pushAfterApply = false;
        schedule();
      }
    },
    isReady: () => ready,
    dispose() {
      flush();
      disposed = true;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.clearTimeout(timer);
      unsubscribe();
      unsubscribe = () => {};
    }
  };
}
