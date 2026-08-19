import useGetAllReplizAccount from "@/features/repliz/hooks/useGetAllReplizAccount";
import {
  useMutateCreateSyncRule,
  useMutateUpdateSyncRule,
} from "@/features/repliz-sync/hooks/useReplizSync";
import type { typeDataReplizSyncRule } from "@/features/repliz-sync/type";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rule?: typeDataReplizSyncRule | null;
};

export default function ModalFormSyncRule({
  open,
  onClose,
  onSuccess,
  rule,
}: Props) {
  const isEdit = Boolean(rule);

  const [label, setLabel] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [replizAccountId, setReplizAccountId] = useState<string | null>(null);
  const [maxItems, setMaxItems] = useState<number | string>(25);
  const [scheduleStartTime, setScheduleStartTime] = useState("06:00");
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState<
    number | string
  >(60);
  const [scrapeMode, setScrapeMode] = useState<"posts" | "reels">("posts");
  const [status, setStatus] = useState<"active" | "paused">("active");

  const { data: dataReplizAccount } = useGetAllReplizAccount({
    page: 1,
    limit: 50,
  });
  const replizAccounts = dataReplizAccount?.data?.data?.docs ?? [];

  const { mutate: createRule, isPending: isCreating } =
    useMutateCreateSyncRule();
  const { mutate: updateRule, isPending: isUpdating } =
    useMutateUpdateSyncRule();

  useEffect(() => {
    if (!open) return;
    setLabel(rule?.label ?? "");
    setTargetUsername(rule?.targetUsername ?? "");
    setReplizAccountId(rule?.replizAccountId ?? null);
    setMaxItems(rule?.maxItems ?? 25);
    setScheduleStartTime(rule?.scheduleStartTime ?? "06:00");
    setScheduleIntervalMinutes(rule?.scheduleIntervalMinutes ?? 60);
    setScrapeMode(rule?.scrapeMode ?? "posts");
    setStatus(rule?.status ?? "active");
  }, [open, rule]);

  const handleSubmit = () => {
    if (!label.trim() || !targetUsername.trim() || !replizAccountId) {
      notifications.show({
        title: "Lengkapi form",
        message: "Label, akun target, dan akun Repliz wajib diisi",
        color: "yellow",
      });
      return;
    }

    const selected = replizAccounts.find((a) => a.id === replizAccountId);
    const payload = {
      label: label.trim(),
      targetUsername: targetUsername.trim(),
      replizAccountId,
      replizAccountLabel: selected
        ? `@${selected.username} (${selected.type})`
        : undefined,
      maxItems: Number(maxItems) || 25,
      scheduleStartTime,
      scheduleIntervalMinutes: Number(scheduleIntervalMinutes) || 60,
      scrapeMode,
      status,
    };

    const onDone = (message: string) => {
      notifications.show({ title: "Sukses", message, color: "green" });
      onSuccess();
      onClose();
    };
    const onFail = (err: unknown) => {
      const axErr = err as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "Error",
        message: axErr?.response?.data?.message ?? "Gagal menyimpan rule",
        color: "red",
      });
    };

    if (isEdit && rule) {
      updateRule(
        { id: rule.id, ...payload },
        { onSuccess: () => onDone("Rule diperbarui"), onError: onFail },
      );
    } else {
      createRule(payload, {
        onSuccess: () => onDone("Rule dibuat"),
        onError: onFail,
      });
    }
  };

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={isEdit ? "Edit Rule Sinkronisasi" : "Tambah Rule Sinkronisasi"}
      centered
    >
      <Stack gap={12}>
        <TextInput
          label="Label"
          placeholder="mis. Clone ClipCraft"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Akun target (z) yang dikloning"
          placeholder="mis. clipcraftcom"
          description="Username Instagram tanpa @"
          value={targetUsername}
          onChange={(e) => setTargetUsername(e.currentTarget.value)}
          required
        />
        <Select
          label="Posting ke akun Repliz (y)"
          placeholder="Pilih akun"
          data={replizAccounts.map((a) => ({
            value: a.id,
            label: `@${a.username} (${a.type})`,
          }))}
          value={replizAccountId}
          onChange={setReplizAccountId}
          required
        />
        <Group grow>
          <NumberInput
            label="Maks konten"
            min={1}
            max={100}
            value={maxItems}
            onChange={setMaxItems}
          />
          <Select
            label="Sumber"
            data={[
              { value: "posts", label: "Posts" },
              { value: "reels", label: "Reels" },
            ]}
            value={scrapeMode}
            onChange={(v) => setScrapeMode((v as "posts" | "reels") ?? "posts")}
          />
        </Group>
        <Group grow>
          <TextInput
            label="Mulai posting"
            placeholder="06:00"
            description="Format HH:mm"
            value={scheduleStartTime}
            onChange={(e) => setScheduleStartTime(e.currentTarget.value)}
          />
          <NumberInput
            label="Jeda antar konten (menit)"
            min={1}
            value={scheduleIntervalMinutes}
            onChange={setScheduleIntervalMinutes}
          />
        </Group>
        <Select
          label="Status"
          data={[
            { value: "active", label: "Aktif" },
            { value: "paused", label: "Dijeda" },
          ]}
          value={status}
          onChange={(v) => setStatus((v as "active" | "paused") ?? "active")}
        />

        <Group justify="flex-end" mt={8}>
          <Button variant="default" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} loading={isCreating || isUpdating}>
            Simpan
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
