import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import CaptionFields from "@/features/master-data/auto-post-rule/components/caption-fields";
import InstagramObserverSourceFields from "@/features/master-data/auto-post-rule/components/instagram-observer-source-fields";
import MediaTypesFields from "@/features/master-data/auto-post-rule/components/media-types-fields";
import TargetsFields from "@/features/master-data/auto-post-rule/components/targets-fields";
import TemplateFields from "@/features/master-data/auto-post-rule/components/template-fields";
import ScheduleFields from "@/features/master-data/auto-post-rule/components/schedule-fields";
import useMutateEditAutoPostRule from "@/features/master-data/auto-post-rule/hooks/useMutateEditAutoPostRule";
import type {
  typeAutoPostTriggerType,
  typeDataAutoPostRule,
} from "@/features/master-data/auto-post-rule/type";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nama aturan wajib diisi").max(255),
  discordAccountId: z.string().optional(),
  discordChannelIds: z.array(z.string()).optional(),
  instagramObserverAccountId: z.string().optional(),
  instagramTargetUsernames: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  includeOriginalCaption: z.boolean(),
  instagramCheckIntervalMinutes: z.number().optional(),
  targets: z
    .array(z.enum(["facebook", "instagram", "telegram", "twitter"]))
    .min(1, "Pilih minimal satu target platform"),
  facebookAccountId: z.string().optional(),
  facebookPostMode: z.enum(["wall", "group"]).optional(),
  facebookGroupIds: z.array(z.string()).optional(),
  instagramAccountId: z.string().optional(),
  twitterAccountId: z.string().optional(),
  telegramAccountId: z.string().optional(),
  telegramChatIds: z.array(z.string()).optional(),
  mediaTypes: z
    .array(z.enum(["image", "video", "text"]))
    .min(1, "Pilih minimal satu tipe media"),
  captionPrefix: z.string().optional(),
  captionSuffix: z.string().optional(),
  captionReplacements: z
    .array(z.object({ find: z.string(), replace: z.string() }))
    .optional(),
  templateMediaPath: z.string().optional(),
  templateMediaType: z.enum(["image", "video"]).optional(),
  templateCaption: z.string().optional(),
  cronExpression: z.string().optional(),
  saveMode: z.boolean(),
  isActive: z.boolean(),
});

export type EditAutoPostRuleSchema = z.infer<typeof schema>;

const TRIGGER_TYPE_LABEL: Record<typeAutoPostTriggerType, string> = {
  discord_observer: "Observer Discord",
  instagram_observer: "Observer Instagram",
  template: "Template Terjadwal",
};

function toFormValues(
  rule: typeDataAutoPostRule | null,
): EditAutoPostRuleSchema {
  return {
    name: rule?.name ?? "",
    discordAccountId: rule?.discord_account_id ?? "",
    discordChannelIds: rule?.discord_channel_ids ?? [],
    instagramObserverAccountId:
      rule?.instagram_observer_account_id ?? undefined,
    instagramTargetUsernames: rule?.instagram_target_usernames ?? [],
    excludeKeywords: rule?.exclude_keywords ?? [],
    includeOriginalCaption: rule?.include_original_caption ?? true,
    instagramCheckIntervalMinutes:
      rule?.instagram_check_interval_minutes ?? 60,
    targets: rule?.targets ?? [],
    facebookAccountId: rule?.facebook_account_id ?? undefined,
    facebookPostMode: rule?.facebook_post_mode ?? "wall",
    facebookGroupIds: rule?.facebook_group_ids ?? [],
    instagramAccountId: rule?.instagram_account_id ?? undefined,
    twitterAccountId: rule?.twitter_account_id ?? undefined,
    telegramAccountId: rule?.telegram_account_id ?? undefined,
    telegramChatIds: rule?.telegram_chat_ids ?? [],
    mediaTypes:
      rule?.trigger_type === "template"
        ? rule?.media_types?.length
          ? rule.media_types
          : ["image"]
        : (rule?.media_types ?? []),
    captionPrefix: rule?.caption_prefix ?? "",
    captionSuffix: rule?.caption_suffix ?? "",
    captionReplacements: rule?.caption_replacements ?? [],
    templateMediaPath: rule?.template_media_path ?? undefined,
    templateMediaType: rule?.template_media_type ?? undefined,
    templateCaption: rule?.template_caption ?? "",
    cronExpression: rule?.cron_expression ?? "0 9 * * *",
    saveMode: rule?.save_mode ?? false,
    isActive: rule?.is_active ?? true,
  };
}

export default function ModalEditAutoPostRule({
  open,
  onClose,
  onSuccess,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValue: typeDataAutoPostRule | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<EditAutoPostRuleSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: toFormValues(null),
  });

  useEffect(() => {
    if (defaultValue) {
      reset(toFormValues(defaultValue));
    }
  }, [defaultValue, reset]);

  const triggerType: typeAutoPostTriggerType =
    defaultValue?.trigger_type ?? "discord_observer";

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const discordAccounts: typeDataAccount[] = (
    accountData?.data?.data ?? []
  ).filter((a) => a.type === "discord");

  const formValue = watch();
  const { mutate, isPending } = useMutateEditAutoPostRule();

  const handleFormClose = () => {
    reset(toFormValues(null));
    onClose();
  };

  const onSubmit = (dataForm: EditAutoPostRuleSchema) => {
    if (!defaultValue?.id) return;

    if (triggerType === "template") {
      if (!dataForm.templateMediaPath || !dataForm.templateMediaType) {
        notifications.show({
          title: "Error",
          message: "Upload media terlebih dahulu",
          color: "red",
        });
        return;
      }
      if (!dataForm.templateCaption?.trim()) {
        notifications.show({
          title: "Error",
          message: "Caption wajib diisi",
          color: "red",
        });
        return;
      }
      if (!dataForm.cronExpression?.trim()) {
        notifications.show({
          title: "Error",
          message: "Jadwal wajib diisi",
          color: "red",
        });
        return;
      }
    }

    mutate(
      {
        ruleId: defaultValue.id,
        payload: {
          name: dataForm.name,
          discordAccountId:
            triggerType === "discord_observer"
              ? dataForm.discordAccountId
              : undefined,
          discordChannelIds:
            triggerType === "discord_observer"
              ? dataForm.discordChannelIds
              : undefined,
          instagramObserverAccountId:
            triggerType === "instagram_observer"
              ? dataForm.instagramObserverAccountId
              : undefined,
          instagramTargetUsernames:
            triggerType === "instagram_observer"
              ? dataForm.instagramTargetUsernames
              : undefined,
          excludeKeywords:
            triggerType === "instagram_observer"
              ? dataForm.excludeKeywords
              : undefined,
          includeOriginalCaption:
            triggerType === "instagram_observer"
              ? dataForm.includeOriginalCaption
              : undefined,
          instagramCheckIntervalMinutes:
            triggerType === "instagram_observer"
              ? dataForm.instagramCheckIntervalMinutes
              : undefined,
          targets: dataForm.targets,
          facebookAccountId: dataForm.targets.includes("facebook")
            ? dataForm.facebookAccountId
            : undefined,
          facebookPostMode: dataForm.targets.includes("facebook")
            ? dataForm.facebookPostMode
            : undefined,
          facebookGroupIds:
            dataForm.targets.includes("facebook") &&
            dataForm.facebookPostMode === "group"
              ? dataForm.facebookGroupIds
              : undefined,
          instagramAccountId: dataForm.targets.includes("instagram")
            ? dataForm.instagramAccountId
            : undefined,
          twitterAccountId: dataForm.targets.includes("twitter")
            ? dataForm.twitterAccountId
            : undefined,
          telegramAccountId: dataForm.targets.includes("telegram")
            ? dataForm.telegramAccountId
            : undefined,
          telegramChatIds: dataForm.targets.includes("telegram")
            ? dataForm.telegramChatIds
            : undefined,
          mediaTypes:
            triggerType === "template"
              ? [dataForm.templateMediaType!]
              : dataForm.mediaTypes,
          captionPrefix:
            triggerType === "template"
              ? undefined
              : dataForm.captionPrefix || undefined,
          captionSuffix:
            triggerType === "template"
              ? undefined
              : dataForm.captionSuffix || undefined,
          captionReplacements:
            triggerType === "template"
              ? undefined
              : dataForm.captionReplacements?.filter((r) => r.find),
          templateMediaPath:
            triggerType === "template"
              ? dataForm.templateMediaPath
              : undefined,
          templateMediaType:
            triggerType === "template"
              ? dataForm.templateMediaType
              : undefined,
          templateCaption:
            triggerType === "template" ? dataForm.templateCaption : undefined,
          cronExpression:
            triggerType === "template" ? dataForm.cronExpression : undefined,
          saveMode: dataForm.saveMode,
          isActive: dataForm.isActive,
        },
      },
      {
        onSuccess: () => {
          handleFormClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          const msg =
            axErr?.response?.data?.message ?? "Gagal mengubah auto post rule";
          notifications.show({ title: "Error", message: msg, color: "red" });
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleFormClose}
      title="Edit Auto Post Rule"
      size="lg"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <ScrollArea.Autosize mah="70vh">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Tipe trigger
              </Text>
              <Badge variant="light">
                {TRIGGER_TYPE_LABEL[triggerType]}
              </Badge>
            </Group>

            <TextInput
              label="Nama Aturan"
              placeholder="Contoh: Repost Channel Promo ke Semua Platform"
              size="sm"
              error={errors.name?.message}
              {...register("name")}
            />

            {triggerType === "discord_observer" && (
              <>
                <Divider label="Sumber Discord" labelPosition="left" />
                <Select
                  label="Akun Discord"
                  placeholder="Pilih akun Discord sumber"
                  data={discordAccounts.map((a) => ({
                    value: a.id,
                    label: a.label,
                  }))}
                  value={formValue.discordAccountId || null}
                  onChange={(val) =>
                    setValue("discordAccountId", val ?? "", {
                      shouldValidate: true,
                    })
                  }
                  error={errors.discordAccountId?.message}
                />
                <TagsInput
                  label="Channel ID Discord"
                  description="Tekan Enter untuk menambah channel ID"
                  placeholder="mis. 123456789012345678"
                  value={formValue.discordChannelIds ?? []}
                  onChange={(val) =>
                    setValue("discordChannelIds", val, {
                      shouldValidate: true,
                    })
                  }
                  error={errors.discordChannelIds?.message}
                />
              </>
            )}
            {triggerType === "instagram_observer" && (
              <>
                <Divider label="Sumber Instagram" labelPosition="left" />
                <InstagramObserverSourceFields
                  value={{
                    instagramObserverAccountId:
                      formValue.instagramObserverAccountId,
                    instagramTargetUsernames:
                      formValue.instagramTargetUsernames ?? [],
                    excludeKeywords: formValue.excludeKeywords ?? [],
                    includeOriginalCaption: formValue.includeOriginalCaption,
                    instagramCheckIntervalMinutes:
                      formValue.instagramCheckIntervalMinutes,
                  }}
                  onChange={(next) => {
                    setValue(
                      "instagramObserverAccountId",
                      next.instagramObserverAccountId,
                      { shouldValidate: true },
                    );
                    setValue(
                      "instagramTargetUsernames",
                      next.instagramTargetUsernames,
                      { shouldValidate: true },
                    );
                    setValue("excludeKeywords", next.excludeKeywords, {
                      shouldValidate: true,
                    });
                    setValue(
                      "includeOriginalCaption",
                      next.includeOriginalCaption,
                      { shouldValidate: true },
                    );
                    setValue(
                      "instagramCheckIntervalMinutes",
                      next.instagramCheckIntervalMinutes,
                      { shouldValidate: true },
                    );
                  }}
                />
              </>
            )}
            {triggerType === "template" && (
              <>
                <Divider label="Media & Jadwal" labelPosition="left" />
                <TemplateFields
                  value={{
                    templateMediaPath: formValue.templateMediaPath,
                    templateMediaType: formValue.templateMediaType,
                    templateCaption: formValue.templateCaption ?? "",
                  }}
                  onChange={(next) => {
                    setValue("templateMediaPath", next.templateMediaPath, {
                      shouldValidate: true,
                    });
                    setValue("templateMediaType", next.templateMediaType, {
                      shouldValidate: true,
                    });
                    setValue("templateCaption", next.templateCaption, {
                      shouldValidate: true,
                    });
                  }}
                />
                {formValue.templateMediaPath && (
                  <Text size="xs" c="dimmed">
                    Media saat ini: {formValue.templateMediaPath} (upload file
                    baru untuk mengganti)
                  </Text>
                )}
                <ScheduleFields
                  value={formValue.cronExpression ?? "0 9 * * *"}
                  onChange={(val) =>
                    setValue("cronExpression", val, { shouldValidate: true })
                  }
                />
              </>
            )}

            <Divider label="Target" labelPosition="left" />
            <TargetsFields
              value={{
                targets: formValue.targets,
                facebookAccountId: formValue.facebookAccountId,
                facebookPostMode: formValue.facebookPostMode,
                facebookGroupIds: formValue.facebookGroupIds,
                instagramAccountId: formValue.instagramAccountId,
                twitterAccountId: formValue.twitterAccountId,
                telegramAccountId: formValue.telegramAccountId,
                telegramChatIds: formValue.telegramChatIds,
              }}
              onChange={(next) => {
                setValue("targets", next.targets, { shouldValidate: true });
                setValue("facebookAccountId", next.facebookAccountId, {
                  shouldValidate: true,
                });
                setValue("facebookPostMode", next.facebookPostMode, {
                  shouldValidate: true,
                });
                setValue("facebookGroupIds", next.facebookGroupIds, {
                  shouldValidate: true,
                });
                setValue("instagramAccountId", next.instagramAccountId, {
                  shouldValidate: true,
                });
                setValue("twitterAccountId", next.twitterAccountId, {
                  shouldValidate: true,
                });
                setValue("telegramAccountId", next.telegramAccountId, {
                  shouldValidate: true,
                });
                setValue("telegramChatIds", next.telegramChatIds, {
                  shouldValidate: true,
                });
              }}
            />
            {errors.targets?.message && (
              <Text size="xs" c="red">
                {errors.targets.message}
              </Text>
            )}

            {triggerType !== "template" && (
              <>
                <Divider label="Media & Caption" labelPosition="left" />
                <MediaTypesFields
                  value={formValue.mediaTypes}
                  onChange={(next) =>
                    setValue("mediaTypes", next, { shouldValidate: true })
                  }
                />
                {errors.mediaTypes?.message && (
                  <Text size="xs" c="red">
                    {errors.mediaTypes.message}
                  </Text>
                )}
                <CaptionFields
                  value={{
                    captionPrefix: formValue.captionPrefix,
                    captionSuffix: formValue.captionSuffix,
                    captionReplacements: formValue.captionReplacements ?? [],
                  }}
                  onChange={(next) => {
                    setValue("captionPrefix", next.captionPrefix);
                    setValue("captionSuffix", next.captionSuffix);
                    setValue("captionReplacements", next.captionReplacements);
                  }}
                />
              </>
            )}

            {triggerType === "discord_observer" && (
              <>
                <Divider label="Pengaturan" labelPosition="left" />
                <Group>
                  <Switch
                    label="Save Mode (hanya proses 1 pesan terakhir per trigger)"
                    checked={formValue.saveMode}
                    onChange={(e) =>
                      setValue("saveMode", e.currentTarget.checked)
                    }
                  />
                </Group>
              </>
            )}
            <Group>
              <Switch
                label="Aktif"
                checked={formValue.isActive}
                onChange={(e) =>
                  setValue("isActive", e.currentTarget.checked)
                }
              />
            </Group>
          </Stack>

          <Group justify="end" mt="lg">
            <Button variant="outline" color="gray" onClick={handleFormClose}>
              Batal
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={!isValid || isPending}
              loading={isPending}
            >
              Simpan
            </Button>
          </Group>
        </form>
      </ScrollArea.Autosize>
    </Modal>
  );
}
