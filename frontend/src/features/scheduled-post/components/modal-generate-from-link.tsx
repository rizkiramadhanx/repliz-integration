import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import { Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateGenerateFromLink from "../hooks/useMutateGenerateFromLink";
import type { typeDataScheduledPost } from "../type";

export default function ModalGenerateFromLink({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (post: typeDataScheduledPost) => void;
}) {
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState("");

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const instagramAccounts: typeDataAccount[] = (accountData?.data?.data ?? []).filter(
    (a) => a.type === "instagram",
  );

  const { mutate, isPending } = useMutateGenerateFromLink();

  const handleClose = () => {
    setSourceAccountId(null);
    setSourceUrl("");
    setError("");
    onClose();
  };

  const handleSubmit = () => {
    setError("");
    if (!sourceAccountId) {
      setError("Pilih akun browsing terlebih dahulu");
      return;
    }
    if (!sourceUrl.trim()) {
      setError("Isi link postingan Instagram");
      return;
    }
    mutate(
      { sourceAccountId, sourceUrl },
      {
        onSuccess: (res) => {
          handleClose();
          onSuccess(res.data);
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          setError(axErr?.response?.data?.message ?? "Gagal generate draft dari link");
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Generate Draft dari Link Instagram"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="sm">
        <Select
          label="Akun Browsing (Instagram)"
          placeholder="Pilih akun"
          data={instagramAccounts.map((a) => ({ value: a.id, label: a.label }))}
          value={sourceAccountId}
          onChange={setSourceAccountId}
        />
        <TextInput
          label="Link Postingan Instagram"
          placeholder="https://www.instagram.com/p/..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.currentTarget.value)}
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
            Generate
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
