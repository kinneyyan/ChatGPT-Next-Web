import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import {
  ApiPath,
  DEFAULT_API_HOST,
  ServiceProvider,
  StoreKey,
} from "../constant";
import { ensure } from "../utils/clone";
import { createPersistStore } from "../utils/store";

/** token过期时间：5天。单位：ms */
const LOGIN_TOKEN_EXPIRES = 5 * 24 * 60 * 60 * 1000;

interface ILoginToken {
  /** token值 */
  value: string;
  /** 存到localStorage时的时间戳  */
  timestamp: number;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export"
    ? DEFAULT_API_HOST + "/api/proxy/openai"
    : ApiPath.OpenAI;

const DEFAULT_ACCESS_STATE: { loginToken?: ILoginToken; [key: string]: any } = {
  accessCode: "",
  useCustomConfig: false,

  provider: ServiceProvider.OpenAI,

  // openai
  openaiUrl: DEFAULT_OPENAI_URL,
  openaiApiKey: "",

  // azure
  azureUrl: "",
  azureApiKey: "",
  azureApiVersion: "2023-08-01-preview",

  // google ai studio
  googleUrl: "",
  googleApiKey: "",
  googleApiVersion: "v1",

  // server config
  needCode: true,
  hideUserApiKey: false,
  hideBalanceQuery: false,
  disableGPT4: false,
  disableFastLink: false,
  customModels: "",

  /**
   * NOTE: the following is added by kinney
   */
  loginToken: undefined,
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({
    enabledAccessControl() {
      this.fetch();

      return get().needCode;
    },

    isValidOpenAI() {
      return ensure(get(), ["openaiApiKey"]);
    },

    isValidAzure() {
      return ensure(get(), ["azureUrl", "azureApiKey", "azureApiVersion"]);
    },

    isValidGoogle() {
      return ensure(get(), ["googleApiKey"]);
    },

    isAuthorized() {
      this.fetch();

      // has token or has code or disabled access control
      return (
        this.isValidOpenAI() ||
        this.isValidAzure() ||
        this.isValidGoogle() ||
        !this.enabledAccessControl() ||
        (this.enabledAccessControl() && ensure(get(), ["accessCode"]))
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
        })
        .catch(() => {
          console.error("[Config] failed to fetch config");
        })
        .finally(() => {
          fetchState = 2;
        });
    },
    isLoginTokenValid() {
      const loginToken = get().loginToken;
      const { value, timestamp } = loginToken || {};
      if (!value || !timestamp) {
        return false;
      }
      return !(Date.now() - timestamp >= LOGIN_TOKEN_EXPIRES);
    },
    updateLoginToken(token: string) {
      set(() => ({ loginToken: { value: token, timestamp: Date.now() } }));
    },
  }),
  {
    name: StoreKey.Access,
    version: 2,
    migrate(persistedState, version) {
      if (version < 2) {
        const state = persistedState as {
          token: string;
          openaiApiKey: string;
          azureApiVersion: string;
          googleApiKey: string;
        };
        state.openaiApiKey = state.token;
        state.azureApiVersion = "2023-08-01-preview";
      }

      return persistedState as any;
    },
  },
);
