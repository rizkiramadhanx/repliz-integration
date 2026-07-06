import { Button, Group, Modal, Stack, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateCreateDraft from "../hooks/useMutateCreateDraft";
import type { typeDataScheduledPost } from "../type";

export default function ModalAddDraft({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (post: typeDataScheduledPost) => void;
}) {
  const [caption, setCaption] = useState("");
  const { mutate, isPending } = useMutateCreateDraft();

  const handleClose = () => {
    setCaption("");
    onClose();
  };

  const handleSubmit = () => {
    mutate(caption, {
      onSuccess: (res) => {
        handleClose();
        onSuccess(res.data);
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Error",
          message: axErr?.response?.data?.message ?? "Gagal membuat draft",
          color: "red",
        });
      },
    });
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Tambah Draft Manual"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="sm">
        <Textarea
          label="Caption"
          placeholder="Tulis caption (opsional, bisa diisi nanti)"
          minRows={3}
          autosize
          value={caption}
          onChange={(e) => setCaption(e.currentTarget.value)}
        />
        <Group justify="end" mt="md">
          <Button variant="outline" color="gray" onClick={handleClose}>
            Batal
          </Button>
          <Button color="primary" loading={isPending} onClick={handleSubmit}>
            Buat Draft
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
