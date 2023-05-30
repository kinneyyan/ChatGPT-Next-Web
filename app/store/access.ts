import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { DEFAULT_API_HOST, DEFAULT_MODELS, StoreKey } from "../constant";

interface IAzureConfig {
  apiKey: string;
  deploymentID: string;
  endpoint: string;
  apiVersion: string;
}

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  hideBalanceQuery: boolean;
  disableGPT4: boolean;

  openaiUrl: string;

  updateToken: (_: string) => void;
  updateCode: (_: string) => void;
  updateOpenAiUrl: (_: string) => void;
  enabledAccessControl: () => boolean;
  isAuthorized: () => boolean;
  fetch: () => void;

  // the following is added by kinney
  azureConfig: Partial<IAzureConfig>;
  loginToken: string;
  updateAzureConfig: (config: Partial<IAzureConfig>) => void;
  updateLoginToken: (token: string) => void;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export" ? DEFAULT_API_HOST : "/api/openai/";
console.log("[API] default openai url", DEFAULT_OPENAI_URL);

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "",
      accessCode: "",
      needCode: true,
      hideUserApiKey: false,
      hideBalanceQuery: false,
      disableGPT4: false,

      openaiUrl: DEFAULT_OPENAI_URL,

      enabledAccessControl() {
        get().fetch();

        return get().needCode;
      },
      updateCode(code: string) {
        set(() => ({ accessCode: code?.trim() }));
      },
      updateToken(token: string) {
        set(() => ({ token: token?.trim() }));
      },
      updateOpenAiUrl(url: string) {
        set(() => ({ openaiUrl: url?.trim() }));
      },
      isAuthorized() {
        get().fetch();

        // has token or has code or disabled access control
        return (
          // !!get().token || !!get().accessCode || !get().enabledAccessControl()
          !!get().token || !!get().azureConfig.apiKey || !!get().accessCode
        );
      },
      fetch() {
        if (fetchState > 0 || getClientConfig()?.buildMode === "export") return;
        fetchState = 1;
        fetch("/api/config", {
          method: "post",
          body: null,
          headers: {
            ...getHeaders(),
          },
        })
          .then((res) => res.json())
          .then((res: DangerConfig) => {
            console.log("[Config] got config from server", res);
            set(() => ({ ...res }));

            if (res.disableGPT4) {
              DEFAULT_MODELS.forEach(
                (m: any) => (m.available = !m.name.startsWith("gpt-4")),
              );
            }
          })
          .catch(() => {
            console.error("[Config] failed to fetch config");
          })
          .finally(() => {
            fetchState = 2;
          });
      },

      // the following is added by kinney
      azureConfig: {
        apiKey: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_KEY,
        deploymentID: process.env.NEXT_PUBLIC_AZURE_DEPLOYMENT_ID,
        endpoint: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_ENDPOINT,
        apiVersion: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION,
      },
      loginToken: "",
      updateAzureConfig(config) {
        set((state) => ({ azureConfig: { ...state.azureConfig, ...config } }));
      },
      updateLoginToken(token: string) {
        set(() => ({ loginToken: token }));
      },
    }),
    {
      name: StoreKey.Access,
      version: 1.1,
      migrate(persistedState, version) {
        const state = persistedState as AccessControlStore;
        if (version < 1.1) {
          state.azureConfig = {
            apiKey: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_KEY,
            deploymentID: process.env.NEXT_PUBLIC_AZURE_DEPLOYMENT_ID,
            endpoint: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_ENDPOINT,
            apiVersion: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION,
          };
        }
        return state as any;
      },
    },
  ),
);
