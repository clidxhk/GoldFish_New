import { LLMModel } from "../client/api";
import { DalleQuality, DalleStyle, ModelSize } from "../typing";
import { getClientConfig } from "../config/client";
import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_TTS_ENGINE,
  DEFAULT_TTS_ENGINES,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_MODELS,
  DEFAULT_TTS_VOICE,
  DEFAULT_TTS_VOICES,
  StoreKey,
  ServiceProvider,
} from "../constant";
import { createPersistStore } from "../utils/store";
import type { Voice } from "rt-client";

export type ModelType = (typeof DEFAULT_MODELS)[number]["name"];
export type TTSModelType = (typeof DEFAULT_TTS_MODELS)[number];
export type TTSVoiceType = (typeof DEFAULT_TTS_VOICES)[number];
export type TTSEngineType = (typeof DEFAULT_TTS_ENGINES)[number];

export type GoldfishSamplingField =
  | "temperature"
  | "top_p"
  | "presence_penalty"
  | "frequency_penalty";

function normalizeGoldfishPromptList(prompts?: string[]): string[] {
  const seen = new Set<string>();

  return (prompts ?? [])
    .map((item) => item?.trim())
    .filter((item): item is string => !!item)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function normalizeGoldfishModelList(models?: string[]): string[] {
  const seen = new Set<string>();

  return (models ?? [])
    .map((item) => item?.trim())
    .filter((item): item is string => !!item)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}

const config = getClientConfig();
const isOpenAIModel = (model?: LLMModel) =>
  model?.provider?.providerName === ServiceProvider.OpenAI;
const getProviderKey = (provider?: LLMModel["provider"]) =>
  (provider?.id || provider?.providerName || "").toLowerCase();

export interface CustomModelEntry {
  name: string;
  displayName: string;
  enabled: boolean;
}

function normalizeCustomModelEntry(
  entry: Partial<CustomModelEntry>,
): CustomModelEntry | null {
  const name = entry.name?.trim();
  if (!name) return null;

  const displayName = entry.displayName?.trim() || name;

  return {
    name,
    displayName,
    enabled: entry.enabled ?? true,
  };
}

export function parseCustomModelEntries(
  customModels: string,
): CustomModelEntry[] {
  return customModels
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const enabled = !item.startsWith("-");
      const nameConfig =
        item.startsWith("+") || item.startsWith("-") ? item.slice(1) : item;
      const [name, displayName] = nameConfig.split("=");
      return normalizeCustomModelEntry({
        name,
        displayName,
        enabled,
      });
    })
    .filter((item): item is CustomModelEntry => item !== null);
}

export function serializeCustomModelEntries(
  entries: CustomModelEntry[],
): string {
  return entries
    .map(normalizeCustomModelEntry)
    .filter((item): item is CustomModelEntry => item !== null)
    .map((item) => {
      const displayName =
        item.displayName && item.displayName !== item.name
          ? `=${item.displayName}`
          : "";
      return `${item.enabled ? "" : "-"}${item.name}${displayName}`;
    })
    .join(",");
}

function withSyncedCustomModels<
  T extends {
    customModels: string;
    customModelEntries?: CustomModelEntry[];
  },
>(state: T): T {
  const entries =
    state.customModelEntries && state.customModelEntries.length > 0
      ? state.customModelEntries
      : parseCustomModelEntries(state.customModels ?? "");

  return {
    ...state,
    customModelEntries: entries,
    customModels: serializeCustomModelEntries(entries),
  } as T;
}

export const DEFAULT_CONFIG = {
  lastUpdate: Date.now(), // timestamp, to merge state

  submitKey: SubmitKey.Enter,
  avatar: "1f603",
  fontSize: 14,
  fontFamily: "",
  theme: Theme.Auto as Theme,
  tightBorder: !!config?.isApp,
  sendPreviewBubble: true,
  enableAutoGenerateTitle: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

  enableArtifacts: true, // show artifacts config

  enableCodeFold: true, // code fold config

  disablePromptHint: false,

  dontShowMaskSplashScreen: false, // dont show splash screen when create chat
  hideBuiltinMasks: false, // dont add builtin masks

  customModels: "",
  customModelEntries: [] as CustomModelEntry[],
  models: DEFAULT_MODELS.filter(isOpenAIModel) as any as LLMModel[],

  modelConfig: {
    model: "gpt-4o-mini" as ModelType,
    providerName: "OpenAI" as ServiceProvider,
    responseCount: 1,
    temperature: 0.5,
    top_p: 1,
    max_tokens: 4000,
    presence_penalty: 0,
    frequency_penalty: 0,
    sendMemory: true,
    historyMessageCount: 4,
    compressMessageLengthThreshold: 1000,
    compressModel: "",
    compressProviderName: "",
    enableInjectSystemPrompts: true,
    goldfish: {
      enabled: false,
      range: 0.2,
      temperature: true,
      top_p: true,
      presence_penalty: true,
      frequency_penalty: true,
      randomModelEnabled: false,
      randomModelSelected: [] as string[],
      randomPromptEnabled: false,
      randomPromptPool: [] as string[],
      randomPromptSelected: [] as string[],
    },
    template: config?.template ?? DEFAULT_INPUT_TEMPLATE,
    size: "1024x1024" as ModelSize,
    quality: "standard" as DalleQuality,
    style: "vivid" as DalleStyle,
  },

  ttsConfig: {
    enable: false,
    autoplay: false,
    engine: DEFAULT_TTS_ENGINE,
    model: DEFAULT_TTS_MODEL,
    voice: DEFAULT_TTS_VOICE,
    speed: 1.0,
  },

  realtimeConfig: {
    enable: false,
    provider: "OpenAI" as ServiceProvider,
    model: "gpt-4o-realtime-preview-2024-10-01",
    apiKey: "",
    azure: {
      endpoint: "",
      deployment: "",
    },
    temperature: 0.9,
    voice: "alloy" as Voice,
  },
};

export type ChatConfig = typeof DEFAULT_CONFIG;

export type ModelConfig = ChatConfig["modelConfig"];
export type TTSConfig = ChatConfig["ttsConfig"];
export type RealtimeConfig = ChatConfig["realtimeConfig"];

export function normalizeGoldfishConfig(
  goldfish?: Partial<ModelConfig["goldfish"]>,
): ModelConfig["goldfish"] {
  return {
    ...DEFAULT_CONFIG.modelConfig.goldfish,
    ...goldfish,
    range: limitNumber(
      goldfish?.range ?? DEFAULT_CONFIG.modelConfig.goldfish.range,
      0,
      1,
      DEFAULT_CONFIG.modelConfig.goldfish.range,
    ),
    randomModelSelected: normalizeGoldfishModelList(
      goldfish?.randomModelSelected,
    ),
    randomPromptPool: normalizeGoldfishPromptList(goldfish?.randomPromptPool),
    randomPromptSelected: normalizeGoldfishPromptList(
      goldfish?.randomPromptSelected,
    ),
  };
}

export function normalizeModelConfig(
  modelConfig?: Partial<ModelConfig>,
): ModelConfig {
  return {
    ...DEFAULT_CONFIG.modelConfig,
    ...modelConfig,
    goldfish: normalizeGoldfishConfig(modelConfig?.goldfish),
  };
}

export function limitNumber(
  x: number,
  min: number,
  max: number,
  defaultValue: number,
) {
  if (isNaN(x)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, x));
}

export const TTSConfigValidator = {
  engine(x: string) {
    return x as TTSEngineType;
  },
  model(x: string) {
    return x as TTSModelType;
  },
  voice(x: string) {
    return x as TTSVoiceType;
  },
  speed(x: number) {
    return limitNumber(x, 0.25, 4.0, 1.0);
  },
};

export const ModalConfigValidator = {
  model(x: string) {
    return x as ModelType;
  },
  responseCount(x: number) {
    return limitNumber(x, 1, 5, 1);
  },
  max_tokens(x: number) {
    return limitNumber(x, 0, 512000, 1024);
  },
  presence_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  frequency_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  temperature(x: number) {
    return limitNumber(x, 0, 2, 1);
  },
  top_p(x: number) {
    return limitNumber(x, 0, 1, 1);
  },
  goldfishRange(x: number) {
    return limitNumber(x, 0, 1, DEFAULT_CONFIG.modelConfig.goldfish.range);
  },
};

export const useAppConfig = createPersistStore(
  withSyncedCustomModels({ ...DEFAULT_CONFIG }),
  (set, get) => ({
    reset() {
      set(() => withSyncedCustomModels({ ...DEFAULT_CONFIG }));
    },

    mergeModels(newModels: LLMModel[]) {
      if (!newModels || newModels.length === 0) {
        return;
      }

      const oldModels = get().models;
      const modelMap: Record<string, LLMModel> = {};

      for (const model of oldModels) {
        model.available = false;
        modelMap[`${model.name}@${model?.provider?.id}`] = model;
      }

      for (const model of newModels) {
        model.available = true;
        modelMap[`${model.name}@${model?.provider?.id}`] = model;
      }

      set(() => ({
        models: Object.values(modelMap),
      }));
    },

    allModels() {},
  }),
  {
    name: StoreKey.Config,
    version: 4.3,

    merge(persistedState, currentState) {
      const state = persistedState as ChatConfig | undefined;
      if (!state) return { ...currentState };
      const models = currentState.models.slice();
      (state.models ?? []).filter(isOpenAIModel).forEach((pModel) => {
        const idx = models.findIndex(
          (v) =>
            v.name === pModel.name &&
            getProviderKey(v.provider) === getProviderKey(pModel.provider),
        );
        // Only hydrate models we still know about in the current build to avoid
        // reviving stale cached entries from older browser state.
        if (idx !== -1) models[idx] = pModel;
      });
      return withSyncedCustomModels({
        ...currentState,
        ...state,
        modelConfig: normalizeModelConfig(state.modelConfig),
        models: models,
      });
    },

    migrate(persistedState, version) {
      const state = persistedState as ChatConfig;

      if (version < 3.4) {
        state.modelConfig.sendMemory = true;
        state.modelConfig.historyMessageCount = 4;
        state.modelConfig.compressMessageLengthThreshold = 1000;
        state.modelConfig.frequency_penalty = 0;
        state.modelConfig.top_p = 1;
        state.modelConfig.template = DEFAULT_INPUT_TEMPLATE;
        state.dontShowMaskSplashScreen = false;
        state.hideBuiltinMasks = false;
      }

      if (version < 3.5) {
        state.customModels = "claude,claude-100k";
      }

      if (version < 3.6) {
        state.modelConfig.enableInjectSystemPrompts = true;
      }

      if (version < 3.7) {
        state.enableAutoGenerateTitle = true;
      }

      if (version < 3.8) {
        state.lastUpdate = Date.now();
      }

      if (version < 3.9) {
        state.modelConfig.template =
          state.modelConfig.template !== DEFAULT_INPUT_TEMPLATE
            ? state.modelConfig.template
            : config?.template ?? DEFAULT_INPUT_TEMPLATE;
      }

      if (version < 4.1) {
        state.modelConfig.compressModel =
          DEFAULT_CONFIG.modelConfig.compressModel;
        state.modelConfig.compressProviderName =
          DEFAULT_CONFIG.modelConfig.compressProviderName;
      }

      if (version < 4.2) {
        state.customModelEntries = parseCustomModelEntries(
          state.customModels ?? "",
        );
      }

      if (version < 4.3) {
        state.modelConfig.responseCount =
          DEFAULT_CONFIG.modelConfig.responseCount;
      }

      state.modelConfig = normalizeModelConfig(state.modelConfig);

      state.models = (state.models ?? []).filter(isOpenAIModel);
      state.modelConfig.providerName = ServiceProvider.OpenAI;
      state.modelConfig.compressProviderName =
        state.modelConfig.compressProviderName === ServiceProvider.OpenAI
          ? ServiceProvider.OpenAI
          : "";
      state.realtimeConfig.provider = ServiceProvider.OpenAI;

      return withSyncedCustomModels(state) as any;
    },
  },
);
