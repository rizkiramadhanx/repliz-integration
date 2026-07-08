import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import {
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateStartBlast from "../hooks/useMutateStartBlast";
import useMutateUploadScheduledMedia from "../hooks/useMutateUploadScheduledMedia";

const extractGroupId = (raw: string): string => {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/\/groups\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  const leadingNumberMatch = trimmed.match(/^(\d+)/);
  return leadingNumberMatch ? leadingNumberMatch[1] : trimmed;
};

export default function ModalBlast({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [facebookAccountId, setFacebookAccountId] = useState<string | null>(
    null,
  );
  const [media, setMedia] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [gapMinutes, setGapMinutes] = useState<number | "">(15);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const facebookAccounts: typeDataAccount[] = (
    accountData?.data?.data ?? []
  ).filter((a) => a.type === "facebook");

  const { mutateAsync: uploadMedia, isPending: isUploading } =
    useMutateUploadScheduledMedia();
  const { mutate: startBlast, isPending: isStarting } = useMutateStartBlast();

  const handleClose = () => {
    setFacebookAccountId(null);
    setMedia(null);
    setCaption("");
    setGroupIds([]);
    setGapMinutes(15);
    setScheduledAt(null);
    setError("");
    onClose();
  };

  const handleStart = async () => {
    setError("");
    if (!facebookAccountId) {
      setError("Pilih akun Facebook terlebih dahulu");
      return;
    }
    if (!caption.trim()) {
      setError("Isi deskripsi/caption");
      return;
    }
    if (groupIds.length === 0) {
      setError("Isi minimal satu ID grup");
      return;
    }
    if (!gapMinutes || gapMinutes < 1) {
      setError("Jeda antar post harus minimal 1 menit");
      return;
    }

    try {
      const mediaPath = media
        ? (await uploadMedia(media)).data.path
        : undefined;
      startBlast(
        {
          facebookAccountId,
          mediaPath,
          caption,
          groupIds,
          gapMinutes,
          scheduledAt: scheduledAt || undefined,
        },
        {
          onSuccess: () => {
            notifications.show({
              title: "Sukses",
              message: `Blast dijadwalkan ke ${groupIds.length} grup`,
              color: "green",
            });
            handleClose();
            onSuccess();
          },
          onError: (err: unknown) => {
            const axErr = err as {
              response?: { data?: { message?: string } };
            };
            setError(axErr?.response?.data?.message ?? "Gagal memulai blast");
          },
        },
      );
    } catch {
      setError("Gagal upload media");
    }
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Blast Terjadwal (Grup Facebook)"
      size="lg"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="sm">
        <Select
          label="Akun Facebook"
          placeholder="Pilih akun"
          data={facebookAccounts.map((a) => ({
            value: a.id,
            label: a.label,
          }))}
          value={facebookAccountId}
          onChange={setFacebookAccountId}
        />
        <FileInput
          label="Video / Foto (opsional)"
          placeholder="Pilih file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          value={media}
          onChange={setMedia}
          clearable
        />
        <Textarea
          label="Deskripsi"
          placeholder="Tulis caption postingan"
          value={caption}
          onChange={(e) => setCaption(e.currentTarget.value)}
          minRows={3}
          autosize
        />
        <TagsInput
          label="ID Grup"
          description="Tekan Enter untuk menambah. Bisa paste link grup Facebook, atau hasil scrape (format 'id (nama grup)') — ID akan otomatis diambil."
          placeholder="mis. 123456789012345 atau https://facebook.com/groups/..."
          splitChars={["\n"]}
          value={groupIds}
          onChange={(val) => setGroupIds(val.map(extractGroupId))}
        />
        <Group grow>
          <NumberInput
            label="Jeda Antar Post (menit)"
            min={1}
            value={gapMinutes}
            onChange={(v) => setGapMinutes(typeof v === "number" ? v : "")}
          />
          <DateTimePicker
            label="Waktu Mulai (opsional)"
            description="Kosongkan untuk langsung mulai sekarang"
            placeholder="Langsung sekarang"
            value={scheduledAt}
            onChange={setScheduledAt}
            minDate={new Date()}
            clearable
          />
        </Group>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="end" mt="md">
          <Button variant="outline" color="gray" onClick={handleClose}>
            Batal
          </Button>
          <Button loading={isUploading || isStarting} onClick={handleStart}>
            Mulai Blast Terjadwal
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
