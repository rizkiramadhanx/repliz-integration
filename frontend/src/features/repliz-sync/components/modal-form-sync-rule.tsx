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
  TagsInput,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

// Untuk akun Page Facebook, Repliz mengisi `username` dengan KATEGORI Page
// ("Recruiter", "Art Gallery", "Shopping & retail") — bukan username asli.
// Memakainya sebagai label membuat semua Page terlihat mirip dan sulit
// dibedakan, jadi `name` (nama Page sebenarnya) yang ditampilkan.
function accountLabel(account: {
  name?: string;
  username?: string;
  type?: string;
}): string {
  const displayName = account.name?.trim() || `@${account.username ?? ''}`;
  return `${displayName} (${account.type ?? '-'})`;
}

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
  const [targetUsernames, setTargetUsernames] = useState<string[]>([]);
  const [replizAccountId, setReplizAccountId] = useState<string | null>(null);
  const [maxItems, setMaxItems] = useState<number | string>(25);
  const [scrapeTime, setScrapeTime] = useState("05:00");
  const [scheduleStartTime, setScheduleStartTime] = useState("06:00");
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState<
    number | string
  >(60);
  const [sourcePlatform, setSourcePlatform] = useState<
    "instagram" | "facebook" | "tiktok"
  >("instagram");
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
    setTargetUsernames(rule?.targetUsernames ?? []);
    setReplizAccountId(rule?.replizAccountId ?? null);
    setMaxItems(rule?.maxItems ?? 25);
    setScrapeTime(rule?.scrapeTime ?? "05:00");
    setScheduleStartTime(rule?.scheduleStartTime ?? "06:00");
    setScheduleIntervalMinutes(rule?.scheduleIntervalMinutes ?? 60);
    setSourcePlatform(rule?.sourcePlatform ?? "instagram");
    setScrapeMode(rule?.scrapeMode ?? "posts");
    setStatus(rule?.status ?? "active");
  }, [open, rule]);

  const handleSubmit = () => {
    if (!label.trim() || targetUsernames.length === 0 || !replizAccountId) {
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
      targetUsernames,
      replizAccountId,
      replizAccountLabel: selected ? accountLabel(selected) : undefined,
      maxItems: Number(maxItems) || 25,
      scrapeTime,
      scheduleStartTime,
      scheduleIntervalMinutes: Number(scheduleIntervalMinutes) || 60,
      sourcePlatform,
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
        <Select
          label="Platform sumber"
          description="TikTok tidak tersedia di sini — pakai menu Impor URL"
          data={[
            { value: "instagram", label: "Instagram" },
            { value: "facebook", label: "Facebook" },
          ]}
          value={sourcePlatform}
          onChange={(v) =>
            setSourcePlatform(
              (v as "instagram" | "facebook" | "tiktok") ?? "instagram",
            )
          }
        />
        <TagsInput
          label="Akun target (z) yang dikloning"
          placeholder="Ketik username lalu Enter atau koma"
          description={
            sourcePlatform === "facebook"
              ? "Username/ID Page atau profil Facebook. Bisa lebih dari satu — pisahkan dengan Enter atau koma."
              : sourcePlatform === "tiktok"
                ? "Username TikTok tanpa @. Bisa lebih dari satu — pisahkan dengan Enter atau koma."
                : "Username Instagram tanpa @. Bisa lebih dari satu — pisahkan dengan Enter atau koma."
          }
          data={[]}
          value={targetUsernames}
          onChange={(values) =>
            setTargetUsernames(
              Array.from(
                new Set(
                  values
                    .map((v) => v.trim().replace(/^@+/, ""))
                    .filter(Boolean),
                ),
              ),
            )
          }
          splitChars={[",", " "]}
          clearable
          required
        />
        <Select
          label="Posting ke akun Repliz (y)"
          placeholder="Pilih akun"
          data={replizAccounts.map((a) => ({
            value: a.id,
            label: accountLabel(a),
          }))}
          searchable
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
            label="Jenis konten"
            description={
              sourcePlatform === "tiktok" ? "Tidak dipakai untuk TikTok" : undefined
            }
            disabled={sourcePlatform === "tiktok"}
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
            label="Jam scrape"
            placeholder="05:00"
            description="Kapan rule ini dicek. Sebar antar rule agar beban tidak menumpuk."
            value={scrapeTime}
            onChange={(e) => setScrapeTime(e.currentTarget.value)}
          />
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
