import { ServiceProvider } from "@/app/constant";
import {
  ModalConfigValidator,
  ModelConfig,
  normalizeModelConfig,
} from "../store";

import Locale from "../locales";
import { InputRange } from "./input-range";
import { ListItem, Select } from "./ui-lib";
import { useAllModels } from "../utils/hooks";
import styles from "./model-config.module.scss";
import { SearchService, usePromptStore } from "../store/prompt";
import { useMemo, useState } from "react";

function normalizeRandomPromptValue(content: string) {
  return content.trim();
}

export function ModelConfigList(props: {
  modelConfig: ModelConfig;
  updateConfig: (updater: (config: ModelConfig) => void) => void;
}) {
  const modelConfig = normalizeModelConfig(props.modelConfig);
  const promptStore = usePromptStore();
  const allModels = useAllModels().filter(
    (v) => v.available && v.provider?.providerName === ServiceProvider.OpenAI,
  );
  const value = modelConfig.model;
  const compressModelValue = modelConfig.compressModel;
  const [promptSearch, setPromptSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const allPrompts = useMemo(() => {
    const userPrompts = promptStore.getUserPrompts();
    const builtinPrompts = SearchService.builtinPrompts;
    const prompts = userPrompts.concat(builtinPrompts);
    const seen = new Set<string>();

    return prompts.filter((prompt) => {
      const key = `${prompt.title.trim()}\n${normalizeRandomPromptValue(
        prompt.content,
      )}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [promptStore, promptStore.prompts]);
  const filteredPrompts = useMemo(() => {
    const keyword = promptSearch.trim().toLowerCase();
    if (!keyword) return allPrompts;

    return allPrompts.filter(
      (prompt) =>
        prompt.title.toLowerCase().includes(keyword) ||
        prompt.content.toLowerCase().includes(keyword),
    );
  }, [allPrompts, promptSearch]);
  const filteredModels = useMemo(() => {
    const keyword = modelSearch.trim().toLowerCase();
    if (!keyword) return allModels;

    return allModels.filter((model) => {
      const displayName = (model.displayName ?? model.name).toLowerCase();
      return (
        model.name.toLowerCase().includes(keyword) ||
        displayName.includes(keyword)
      );
    });
  }, [allModels, modelSearch]);

  return (
    <>
      <ListItem
        title={Locale.Settings.Goldfish.Enabled.Title}
        subTitle={Locale.Settings.Goldfish.Enabled.SubTitle}
      >
        <input
          aria-label={Locale.Settings.Goldfish.Enabled.Title}
          type="checkbox"
          checked={!!modelConfig.goldfish?.enabled}
          onChange={(e) =>
            props.updateConfig(
              (config) => (config.goldfish.enabled = e.currentTarget.checked),
            )
          }
        ></input>
      </ListItem>

      {modelConfig.goldfish?.enabled && (
        <>
          <ListItem
            title={Locale.Settings.Goldfish.Range.Title}
            subTitle={Locale.Settings.Goldfish.Range.SubTitle}
          >
            <InputRange
              aria={Locale.Settings.Goldfish.Range.Title}
              value={modelConfig.goldfish.range.toFixed(1)}
              min="0"
              max="1"
              step="0.1"
              onChange={(e) => {
                props.updateConfig(
                  (config) =>
                    (config.goldfish.range = ModalConfigValidator.goldfishRange(
                      e.currentTarget.valueAsNumber,
                    )),
                );
              }}
            ></InputRange>
          </ListItem>

          <ListItem
            title={Locale.Settings.Goldfish.Temperature.Title}
            subTitle={Locale.Settings.Goldfish.Temperature.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Goldfish.Temperature.Title}
              type="checkbox"
              checked={!!modelConfig.goldfish.temperature}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.goldfish.temperature = e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.Goldfish.TopP.Title}
            subTitle={Locale.Settings.Goldfish.TopP.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Goldfish.TopP.Title}
              type="checkbox"
              checked={!!modelConfig.goldfish.top_p}
              onChange={(e) =>
                props.updateConfig(
                  (config) => (config.goldfish.top_p = e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.Goldfish.PresencePenalty.Title}
            subTitle={Locale.Settings.Goldfish.PresencePenalty.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Goldfish.PresencePenalty.Title}
              type="checkbox"
              checked={!!modelConfig.goldfish.presence_penalty}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.goldfish.presence_penalty =
                      e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.Goldfish.FrequencyPenalty.Title}
            subTitle={Locale.Settings.Goldfish.FrequencyPenalty.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Goldfish.FrequencyPenalty.Title}
              type="checkbox"
              checked={!!modelConfig.goldfish.frequency_penalty}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.goldfish.frequency_penalty =
                      e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.Goldfish.RandomModel.Enabled.Title}
            subTitle={Locale.Settings.Goldfish.RandomModel.Enabled.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Goldfish.RandomModel.Enabled.Title}
              type="checkbox"
              checked={!!modelConfig.goldfish.randomModelEnabled}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.goldfish.randomModelEnabled =
                      e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          {modelConfig.goldfish.randomModelEnabled && (
            <ListItem
              title={Locale.Settings.Goldfish.RandomModel.Selected.Title}
              subTitle={Locale.Settings.Goldfish.RandomModel.Selected.SubTitle}
              vertical
            >
              <input
                aria-label={Locale.Settings.Goldfish.RandomModel.Search}
                className={styles["random-prompt-search"]}
                type="text"
                value={modelSearch}
                placeholder={Locale.Settings.Goldfish.RandomModel.Search}
                onChange={(e) => setModelSearch(e.currentTarget.value)}
              />
              <div className={styles["random-prompt-pool-list"]}>
                {filteredModels.length > 0 ? (
                  filteredModels.map((model) => {
                    const modelValue = model.name;
                    const selected =
                      modelConfig.goldfish.randomModelSelected.includes(
                        modelValue,
                      );

                    return (
                      <button
                        key={`${model.provider.id}-${model.name}`}
                        type="button"
                        className={styles["random-prompt-chip"]}
                        data-selected={selected}
                        title={model.name}
                        onClick={() => {
                          props.updateConfig((config) => {
                            const selectedSet = new Set(
                              config.goldfish.randomModelSelected,
                            );

                            if (selectedSet.has(modelValue)) {
                              selectedSet.delete(modelValue);
                            } else {
                              selectedSet.add(modelValue);
                            }

                            config.goldfish.randomModelSelected =
                              Array.from(selectedSet);
                          });
                        }}
                      >
                        <span className={styles["random-prompt-chip-title"]}>
                          {model.displayName ?? model.name}
                        </span>
                        <span className={styles["random-prompt-chip-content"]}>
                          {model.name}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles["random-prompt-empty"]}>
                    {Locale.Settings.Goldfish.RandomModel.Selected.Empty}
                  </div>
                )}
              </div>
            </ListItem>
          )}

          <ListItem
            title={Locale.Settings.Goldfish.RandomPrompt.Enabled.Title}
            subTitle={Locale.Settings.Goldfish.RandomPrompt.Enabled.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Goldfish.RandomPrompt.Enabled.Title}
              type="checkbox"
              checked={!!modelConfig.goldfish.randomPromptEnabled}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.goldfish.randomPromptEnabled =
                      e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          {modelConfig.goldfish.randomPromptEnabled && (
            <>
              <ListItem
                title={Locale.Settings.Goldfish.RandomPrompt.Selected.Title}
                subTitle={
                  Locale.Settings.Goldfish.RandomPrompt.Selected.SubTitle
                }
                vertical
              >
                <input
                  aria-label={Locale.Settings.Goldfish.RandomPrompt.Search}
                  className={styles["random-prompt-search"]}
                  type="text"
                  value={promptSearch}
                  placeholder={Locale.Settings.Goldfish.RandomPrompt.Search}
                  onChange={(e) => setPromptSearch(e.currentTarget.value)}
                />
                <div className={styles["random-prompt-pool-list"]}>
                  {filteredPrompts.length > 0 ? (
                    filteredPrompts.map((prompt) => {
                      const promptValue = normalizeRandomPromptValue(
                        prompt.content,
                      );
                      const selected =
                        modelConfig.goldfish.randomPromptSelected.includes(
                          promptValue,
                        );

                      return (
                        <button
                          key={prompt.id}
                          type="button"
                          className={styles["random-prompt-chip"]}
                          data-selected={selected}
                          title={prompt.content}
                          onClick={() => {
                            props.updateConfig((config) => {
                              const selectedSet = new Set(
                                config.goldfish.randomPromptSelected,
                              );

                              if (selectedSet.has(promptValue)) {
                                selectedSet.delete(promptValue);
                              } else {
                                selectedSet.add(promptValue);
                              }

                              config.goldfish.randomPromptSelected =
                                Array.from(selectedSet);
                            });
                          }}
                        >
                          <span className={styles["random-prompt-chip-title"]}>
                            {prompt.title}
                          </span>
                          <span
                            className={styles["random-prompt-chip-content"]}
                          >
                            {prompt.content}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className={styles["random-prompt-empty"]}>
                      {Locale.Settings.Goldfish.RandomPrompt.Selected.Empty}
                    </div>
                  )}
                </div>
              </ListItem>
            </>
          )}
        </>
      )}

      <ListItem title={Locale.Settings.Model}>
        <Select
          aria-label={Locale.Settings.Model}
          value={value}
          align="left"
          onChange={(e) => {
            props.updateConfig((config) => {
              config.model = ModalConfigValidator.model(e.currentTarget.value);
              config.providerName = ServiceProvider.OpenAI;
            });
          }}
        >
          {allModels.map((v, i) => (
            <option value={v.name} key={i}>
              {v.displayName}
            </option>
          ))}
        </Select>
      </ListItem>
      <ListItem
        title={Locale.Settings.ResponseCount.Title}
        subTitle={Locale.Settings.ResponseCount.SubTitle}
      >
        <InputRange
          aria={Locale.Settings.ResponseCount.Title}
          title={modelConfig.responseCount.toString()}
          value={modelConfig.responseCount}
          min="1"
          max="5"
          step="1"
          onChange={(e) => {
            props.updateConfig(
              (config) =>
                (config.responseCount = ModalConfigValidator.responseCount(
                  e.currentTarget.valueAsNumber,
                )),
            );
          }}
        ></InputRange>
      </ListItem>
      <ListItem
        title={Locale.Settings.Temperature.Title}
        subTitle={Locale.Settings.Temperature.SubTitle}
      >
        <InputRange
          aria={Locale.Settings.Temperature.Title}
          value={modelConfig.temperature?.toFixed(1)}
          min="0"
          max="1" // lets limit it to 0-1
          step="0.1"
          onChange={(e) => {
            props.updateConfig(
              (config) =>
                (config.temperature = ModalConfigValidator.temperature(
                  e.currentTarget.valueAsNumber,
                )),
            );
          }}
        ></InputRange>
      </ListItem>
      <ListItem
        title={Locale.Settings.TopP.Title}
        subTitle={Locale.Settings.TopP.SubTitle}
      >
        <InputRange
          aria={Locale.Settings.TopP.Title}
          value={(modelConfig.top_p ?? 1).toFixed(1)}
          min="0"
          max="1"
          step="0.1"
          onChange={(e) => {
            props.updateConfig(
              (config) =>
                (config.top_p = ModalConfigValidator.top_p(
                  e.currentTarget.valueAsNumber,
                )),
            );
          }}
        ></InputRange>
      </ListItem>
      <ListItem
        title={Locale.Settings.MaxTokens.Title}
        subTitle={Locale.Settings.MaxTokens.SubTitle}
      >
        <input
          aria-label={Locale.Settings.MaxTokens.Title}
          type="number"
          min={1024}
          max={512000}
          value={modelConfig.max_tokens}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.max_tokens = ModalConfigValidator.max_tokens(
                  e.currentTarget.valueAsNumber,
                )),
            )
          }
        ></input>
      </ListItem>

      <>
        <ListItem
          title={Locale.Settings.PresencePenalty.Title}
          subTitle={Locale.Settings.PresencePenalty.SubTitle}
        >
          <InputRange
            aria={Locale.Settings.PresencePenalty.Title}
            value={modelConfig.presence_penalty?.toFixed(1)}
            min="-2"
            max="2"
            step="0.1"
            onChange={(e) => {
              props.updateConfig(
                (config) =>
                  (config.presence_penalty =
                    ModalConfigValidator.presence_penalty(
                      e.currentTarget.valueAsNumber,
                    )),
              );
            }}
          ></InputRange>
        </ListItem>

        <ListItem
          title={Locale.Settings.FrequencyPenalty.Title}
          subTitle={Locale.Settings.FrequencyPenalty.SubTitle}
        >
          <InputRange
            aria={Locale.Settings.FrequencyPenalty.Title}
            value={modelConfig.frequency_penalty?.toFixed(1)}
            min="-2"
            max="2"
            step="0.1"
            onChange={(e) => {
              props.updateConfig(
                (config) =>
                  (config.frequency_penalty =
                    ModalConfigValidator.frequency_penalty(
                      e.currentTarget.valueAsNumber,
                    )),
              );
            }}
          ></InputRange>
        </ListItem>

        <ListItem
          title={Locale.Settings.InjectSystemPrompts.Title}
          subTitle={Locale.Settings.InjectSystemPrompts.SubTitle}
        >
          <input
            aria-label={Locale.Settings.InjectSystemPrompts.Title}
            type="checkbox"
            checked={modelConfig.enableInjectSystemPrompts}
            onChange={(e) =>
              props.updateConfig(
                (config) =>
                  (config.enableInjectSystemPrompts = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Settings.InputTemplate.Title}
          subTitle={Locale.Settings.InputTemplate.SubTitle}
        >
          <input
            aria-label={Locale.Settings.InputTemplate.Title}
            type="text"
            value={modelConfig.template}
            onChange={(e) =>
              props.updateConfig(
                (config) => (config.template = e.currentTarget.value),
              )
            }
          ></input>
        </ListItem>
      </>
      <ListItem
        title={Locale.Settings.HistoryCount.Title}
        subTitle={Locale.Settings.HistoryCount.SubTitle}
      >
        <InputRange
          aria={Locale.Settings.HistoryCount.Title}
          title={modelConfig.historyMessageCount.toString()}
          value={modelConfig.historyMessageCount}
          min="0"
          max="64"
          step="1"
          onChange={(e) =>
            props.updateConfig(
              (config) => (config.historyMessageCount = e.target.valueAsNumber),
            )
          }
        ></InputRange>
      </ListItem>

      <ListItem
        title={Locale.Settings.CompressThreshold.Title}
        subTitle={Locale.Settings.CompressThreshold.SubTitle}
      >
        <input
          aria-label={Locale.Settings.CompressThreshold.Title}
          type="number"
          min={500}
          max={4000}
          value={modelConfig.compressMessageLengthThreshold}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.compressMessageLengthThreshold =
                  e.currentTarget.valueAsNumber),
            )
          }
        ></input>
      </ListItem>
      <ListItem title={Locale.Memory.Title} subTitle={Locale.Memory.Send}>
        <input
          aria-label={Locale.Memory.Title}
          type="checkbox"
          checked={modelConfig.sendMemory}
          onChange={(e) =>
            props.updateConfig(
              (config) => (config.sendMemory = e.currentTarget.checked),
            )
          }
        ></input>
      </ListItem>
      <ListItem
        title={Locale.Settings.CompressModel.Title}
        subTitle={Locale.Settings.CompressModel.SubTitle}
      >
        <Select
          className={styles["select-compress-model"]}
          aria-label={Locale.Settings.CompressModel.Title}
          value={compressModelValue}
          onChange={(e) => {
            props.updateConfig((config) => {
              config.compressModel = ModalConfigValidator.model(
                e.currentTarget.value,
              );
              config.compressProviderName = ServiceProvider.OpenAI;
            });
          }}
        >
          {allModels.map((v, i) => (
            <option value={v.name} key={i}>
              {v.displayName}
            </option>
          ))}
        </Select>
      </ListItem>
    </>
  );
}
