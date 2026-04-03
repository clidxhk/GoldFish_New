import { useMemo } from "react";
import { useAccessStore, useAppConfig } from "../store";
import { ServiceProvider } from "../constant";
import { collectModelsWithDefaultModel } from "./model";

export function useAllModels() {
  const accessStore = useAccessStore();
  const configStore = useAppConfig();
  const models = useMemo(() => {
    return collectModelsWithDefaultModel(
      configStore.models,
      [accessStore.customModels, configStore.customModels].join(","),
      accessStore.defaultModel,
    ).filter(
      (model) => model.provider?.providerName === ServiceProvider.OpenAI,
    );
  }, [
    accessStore.customModels,
    accessStore.defaultModel,
    configStore.customModels,
    configStore.models,
  ]);

  return models;
}
