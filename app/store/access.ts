import {
  ApiPath,
  OPENAI_BASE_URL,
  ServiceProvider,
  StoreKey,
} from "../constant";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";
import { ensure } from "../utils/clone";
import { DEFAULT_CONFIG } from "./config";
import { getModelProvider } from "../utils/model";

let fetchState = 0;

const isApp = getClientConfig()?.buildMode === "export";
const DEFAULT_OPENAI_URL = isApp ? OPENAI_BASE_URL : ApiPath.OpenAI;

const DEFAULT_ACCESS_STATE = {
  accessCode: "",
  useCustomConfig: false,
  provider: ServiceProvider.OpenAI,
  openaiUrl: DEFAULT_OPENAI_URL,
  openaiApiKey: "",
  azureUrl: "",
  azureApiKey: "",
  azureApiVersion: "",
  googleUrl: "",
  googleApiKey: "",
  googleApiVersion: "",
  googleSafetySettings: "",
  anthropicUrl: "",
  anthropicApiKey: "",
  anthropicApiVersion: "",
  baiduUrl: "",
  baiduApiKey: "",
  baiduSecretKey: "",
  bytedanceUrl: "",
  bytedanceApiKey: "",
  alibabaUrl: "",
  alibabaApiKey: "",
  moonshotUrl: "",
  moonshotApiKey: "",
  stabilityUrl: "",
  stabilityApiKey: "",
  tencentUrl: "",
  tencentSecretKey: "",
  tencentSecretId: "",
  iflytekUrl: "",
  iflytekApiKey: "",
  iflytekApiSecret: "",
  deepseekUrl: "",
  deepseekApiKey: "",
  xaiUrl: "",
  xaiApiKey: "",
  chatglmUrl: "",
  chatglmApiKey: "",
  siliconflowUrl: "",
  siliconflowApiKey: "",
  ai302Url: "",
  ai302ApiKey: "",
  needCode: true,
  hideUserApiKey: false,
  hideBalanceQuery: false,
  disableGPT4: false,
  disableFastLink: false,
  customModels: "",
  defaultModel: "",
  visionModels: "",
  edgeTTSVoiceName: "zh-CN-YunxiNeural",
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },
  (set, get) => ({
    enabledAccessControl() {
      this.fetch();
      return get().needCode;
    },
    getVisionModels() {
      this.fetch();
      return get().visionModels;
    },
    edgeVoiceName() {
      this.fetch();
      return get().edgeTTSVoiceName;
    },
    isValidOpenAI() {
      return ensure(get(), ["openaiApiKey"]);
    },
    isValidAzure() {
      return ensure(get(), ["azureUrl", "azureApiKey", "azureApiVersion"]);
    },
    isAuthorized() {
      this.fetch();
      return (
        this.isValidOpenAI() ||
        this.isValidAzure() ||
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
        .then((res) => {
          const defaultModel = res.defaultModel ?? "";
          if (defaultModel !== "") {
            const [model, providerName] = getModelProvider(defaultModel);
            DEFAULT_CONFIG.modelConfig.model = model;
            DEFAULT_CONFIG.modelConfig.providerName = providerName as any;
          }

          return res;
        })
        .then((res: DangerConfig) => {
          console.log("[Config] got config from server", res);
          set(() => ({ ...res, provider: ServiceProvider.OpenAI }));
        })
        .catch(() => {
          console.error("[Config] failed to fetch config");
        })
        .finally(() => {
          fetchState = 2;
        });
    },
  }),
  {
    name: StoreKey.Access,
    version: 3,
    migrate(persistedState, version) {
      const state = persistedState as any;
      if (version < 2) {
        state.openaiApiKey = state.token;
      }

      return {
        ...DEFAULT_ACCESS_STATE,
        ...state,
        provider: ServiceProvider.OpenAI,
      } as any;
    },
  },
);
