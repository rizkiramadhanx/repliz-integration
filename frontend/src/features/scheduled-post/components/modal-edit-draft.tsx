import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import {
  Badge,
  Button,
  FileInput,
  Group,
  Image,
  MultiSelect,
  Stack,
  Modal,
  Text,
  Textarea,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateUpdateDraft from "../hooks/useMutateUpdateDraft";
import useMutateSchedulePost from "../hooks/useMutateSchedulePost";
import type { typeDataScheduledPost } from "../type";

export default function ModalEditDraft({
  open,
  onClose,
  onSuccess,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValue: typeDataScheduledPost | null;
}) {
  const [caption, setCaption] = useState("");
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const [media, setMedia] = useState<File | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const accounts: typeDataAccount[] = accountData?.data?.data ?? [];

  const { mutateAsync: updateDraft, isPending: isSaving } = useMutateUpdateDraft();
  const { mutateAsync: schedulePost, isPending: isScheduling } = useMutateSchedulePost();

  useEffect(() => {
    if (defaultValue) {
      setCaption(defaultValue.caption);
      setTargetAccountIds(defaultValue.target_account_ids);
      setMedia(null);
      setScheduledAt(defaultValue.scheduled_at);
      setError("");
    }
  }, [defaultValue]);

  const handleClose = () => {
    setCaption("");
    setTargetAccountIds([]);
    setMedia(null);
    setScheduledAt(null);
    setError("");
    onClose();
  };

  const handleSaveDraft = async () => {
    if (!defaultValue) return;
    setError("");
    try {
      await updateDraft({
        id: defaultValue.id,
        caption,
        targetAccountIds,
        media,
      });
      notifications.show({
        title: "Sukses",
        message: "Draft berhasil disimpan",
        color: "green",
      });
      handleClose();
      onSuccess();
    } catch (err) {
      const axErr = err as { response?: { data?: { message?: string } } };
      setError(axErr?.response?.data?.message ?? "Gagal menyimpan draft");
    }
  };

  const handleSchedule = async () => {
    if (!defaultValue) return;
    setError("");
    if (!scheduledAt) {
      setError("Pilih tanggal & waktu publish");
      return;
    }
    try {
      await updateDraft({ id: defaultValue.id, caption, targetAccountIds, media });
      await schedulePost({ id: defaultValue.id, scheduledAt });
      notifications.show({
        title: "Sukses",
        message: "Post berhasil dijadwalkan",
        color: "green",
      });
      handleClose();
      onSuccess();
    } catch (err) {
      const axErr = err as { response?: { data?: { message?: string } } };
      setError(axErr?.response?.data?.message ?? "Gagal menjadwalkan post");
    }
  };

  const previewUrl = media
    ? URL.createObjectURL(media)
    : defaultValue?.thumbnail_url ?? null;
  const previewIsVideo = defaultValue?.is_video ?? false;

  const isSubmitting = isSaving || isScheduling;

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Edit Draft / Jadwalkan Post"
      size="lg"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="sm">
        {defaultValue?.media_path && !media && (
          <Text size="sm" c="dimmed">
            Media saat ini: {defaultValue.media_path.split("/").pop()}
          </Text>
        )}
        {previewUrl && (
          <div style={{ position: "relative" }}>
            <Image src={previewUrl} h={160} fit="contain" radius="sm" />
            {previewIsVideo && (
              <Badge
                size="sm"
                color="dark"
                style={{ position: "absolute", top: 8, right: 8 }}
              >
                Video
              </Badge>
            )}
          </div>
        )}
        {previewUrl && previewIsVideo && !media && (
          <Text size="xs" c="dimmed">
            Video dari Instagram — media asli akan diambil ulang saat publish.
          </Text>
        )}
        <FileInput
          label="Ganti Media"
          placeholder="Pilih file foto/video"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          value={media}
          onChange={setMedia}
          clearable
        />
        <Textarea
          label="Caption"
          minRows={4}
          autosize
          value={caption}
          onChange={(e) => setCaption(e.currentTarget.value)}
        />
        <MultiSelect
          label="Target Akun"
          placeholder="Pilih akun tujuan"
          data={accounts.map((a) => ({ value: a.id, label: `${a.label} (${a.type})` }))}
          value={targetAccountIds}
          onChange={setTargetAccountIds}
          searchable
        />
        <DateTimePicker
          label="Jadwalkan Publish"
          placeholder="Pilih tanggal & waktu"
          value={scheduledAt}
          onChange={setScheduledAt}
          minDate={new Date()}
          clearable
        />
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="end" mt="md">
          <Button variant="outline" color="gray" onClick={handleClose}>
            Batal
          </Button>
          <Button
            variant="light"
            color="primary"
            loading={isSaving}
            disabled={isSubmitting}
            onClick={handleSaveDraft}
          >
            Simpan sebagai Draft
          </Button>
          <Button
            color="primary"
            loading={isScheduling}
            disabled={isSubmitting}
            onClick={handleSchedule}
          >
            Jadwalkan
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
