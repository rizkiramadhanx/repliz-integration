import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import { Button, Group, Modal, MultiSelect, NumberInput, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateGenerateDraftsFromScrape from "../hooks/useMutateGenerateDraftsFromScrape";

export default function ModalGenerateDrafts({
  open,
  onClose,
  onSuccess,
  batchJobId,
  scrapedPostIds,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchJobId: string | null;
  scrapedPostIds: string[];
}) {
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const [gapMinutes, setGapMinutes] = useState<number | "">(15);
  const [error, setError] = useState("");

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const accounts: typeDataAccount[] = accountData?.data?.data ?? [];

  const { mutate, isPending } = useMutateGenerateDraftsFromScrape();

  const handleClose = () => {
    setTargetAccountIds([]);
    setGapMinutes(15);
    setError("");
    onClose();
  };

  const handleSubmit = () => {
    setError("");
    if (!batchJobId) return;
    if (targetAccountIds.length === 0) {
      setError("Pilih akun tujuan posting terlebih dahulu");
      return;
    }
    if (!gapMinutes || gapMinutes < 15) {
      setError("Jeda antar post minimal 15 menit");
      return;
    }
    mutate(
      { batchJobId, scrapedPostIds, targetAccountIds, gapMinutes },
      {
        onSuccess: () => {
          notifications.show({
            title: "Sukses",
            message: "Draft berhasil dibuat dari hasil scrape",
            color: "green",
          });
          handleClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          setError(axErr?.response?.data?.message ?? "Gagal generate draft");
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={`Generate Draft dari ${scrapedPostIds.length} Post Terpilih`}
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="sm">
        <MultiSelect
          label="Akun Tujuan Posting"
          placeholder="Pilih akun"
          data={accounts.map((a) => ({ value: a.id, label: `${a.label} (${a.type})` }))}
          value={targetAccountIds}
          onChange={setTargetAccountIds}
          searchable
        />
        <NumberInput
          label="Jeda Antar Post (menit)"
          description="Minimal 15 menit per akun target"
          min={15}
          step={15}
          value={gapMinutes}
          onChange={(v) => setGapMinutes(typeof v === "number" ? v : "")}
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
          <Button color="primary" loading={isPending} onClick={handleSubmit}>
            Generate Draft
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
