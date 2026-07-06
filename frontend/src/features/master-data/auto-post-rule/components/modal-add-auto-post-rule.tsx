import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import CaptionFields from "@/features/master-data/auto-post-rule/components/caption-fields";
import MediaTypesFields from "@/features/master-data/auto-post-rule/components/media-types-fields";
import TargetsFields from "@/features/master-data/auto-post-rule/components/targets-fields";
import useMutateAddAutoPostRule from "@/features/master-data/auto-post-rule/hooks/useMutateAddAutoPostRule";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nama aturan wajib diisi").max(255),
  discordAccountId: z.string().min(1, "Pilih akun Discord sumber"),
  discordChannelIds: z
    .array(z.string())
    .min(1, "Isi minimal satu channel ID"),
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
  saveMode: z.boolean(),
  isActive: z.boolean(),
});

export type AddAutoPostRuleSchema = z.infer<typeof schema>;

const DEFAULT_VALUES: AddAutoPostRuleSchema = {
  name: "",
  discordAccountId: "",
  discordChannelIds: [],
  targets: [],
  facebookAccountId: undefined,
  facebookPostMode: "wall",
  facebookGroupIds: [],
  instagramAccountId: undefined,
  twitterAccountId: undefined,
  telegramAccountId: undefined,
  telegramChatIds: [],
  mediaTypes: [],
  captionPrefix: "",
  captionSuffix: "",
  captionReplacements: [],
  saveMode: false,
  isActive: true,
};

export default function ModalAddAutoPostRule({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<AddAutoPostRuleSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const discordAccounts: typeDataAccount[] = (
    accountData?.data?.data ?? []
  ).filter((a) => a.type === "discord");

  const formValue = watch();
  const { mutate, isPending } = useMutateAddAutoPostRule();

  const handleFormClose = () => {
    reset(DEFAULT_VALUES);
    onClose();
  };

  const onSubmit = (dataForm: AddAutoPostRuleSchema) => {
    mutate(
      {
        name: dataForm.name,
        discordAccountId: dataForm.discordAccountId,
        discordChannelIds: dataForm.discordChannelIds,
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
        mediaTypes: dataForm.mediaTypes,
        captionPrefix: dataForm.captionPrefix || undefined,
        captionSuffix: dataForm.captionSuffix || undefined,
        captionReplacements: dataForm.captionReplacements?.filter(
          (r) => r.find,
        ),
        saveMode: dataForm.saveMode,
        isActive: dataForm.isActive,
      },
      {
        onSuccess: () => {
          handleFormClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          const msg =
            axErr?.response?.data?.message ?? "Gagal membuat auto post rule";
          notifications.show({ title: "Error", message: msg, color: "red" });
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleFormClose}
      title="Tambah Auto Post Rule"
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
            <TextInput
              label="Nama Aturan"
              placeholder="Contoh: Repost Channel Promo ke Semua Platform"
              size="sm"
              error={errors.name?.message}
              {...register("name")}
            />

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
              value={formValue.discordChannelIds}
              onChange={(val) =>
                setValue("discordChannelIds", val, { shouldValidate: true })
              }
              error={errors.discordChannelIds?.message}
            />

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
