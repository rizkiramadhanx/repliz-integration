import { Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateStartBlast from "../hooks/useMutateStartBlast";
import type { typeDataBlastJob } from "../type";

export default function ModalDuplicateBlast({
  open,
  onClose,
  onSuccess,
  source,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  source: typeDataBlastJob | null;
}) {
  const [gapMinutes, setGapMinutes] = useState<number | "">(15);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && source) {
      setGapMinutes(source.gap_minutes);
      setScheduledAt(null);
      setError("");
    }
  }, [open, source]);

  const { mutate: startBlast, isPending } = useMutateStartBlast();

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleDuplicate = () => {
    if (!source) return;
    setError("");
    if (!gapMinutes || gapMinutes < 1) {
      setError("Jeda antar post harus minimal 1 menit");
      return;
    }

    startBlast(
      {
        facebookAccountId: source.facebook_account_id,
        mediaPath: source.media_path ?? undefined,
        caption: source.caption,
        groupIds: source.group_ids,
        gapMinutes,
        scheduledAt: scheduledAt || undefined,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: "Sukses",
            message: `Blast diduplikasi ke ${source.group_ids.length} grup`,
            color: "green",
          });
          handleClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          setError(axErr?.response?.data?.message ?? "Gagal menduplikasi blast");
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Duplikasi Blast Terjadwal"
      size="md"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Akun, media, caption, dan {source?.group_ids.length ?? 0} ID grup akan
          disalin sama persis dari blast sebelumnya.
        </Text>
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
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="end" mt="md">
          <Button variant="outline" color="gray" onClick={handleClose}>
            Batal
          </Button>
          <Button loading={isPending} onClick={handleDuplicate}>
            Duplikasi & Mulai
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
