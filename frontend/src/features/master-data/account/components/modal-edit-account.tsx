import useMutateEditAccount from "@/features/master-data/account/hooks/useMutateEditAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  label: z.string().min(1, "Label wajib diisi").max(255),
});

export type EditAccountSchema = z.infer<typeof schema>;

export default function ModalEditAccount({
  open,
  onClose,
  onSuccess,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValue: typeDataAccount | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<EditAccountSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { label: "" },
  });

  useEffect(() => {
    if (defaultValue) {
      reset({ label: defaultValue.label });
    }
  }, [defaultValue, reset]);

  const { mutate, isPending } = useMutateEditAccount();

  const handleFormClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (dataForm: EditAccountSchema) => {
    if (!defaultValue?.id) return;
    mutate(
      { accountId: defaultValue.id, payload: { label: dataForm.label } },
      {
        onSuccess: () => {
          handleFormClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          const msg = axErr?.response?.data?.message ?? "Gagal mengubah akun";
          notifications.show({ title: "Error", message: msg, color: "red" });
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleFormClose}
      title="Edit Account"
      size="md"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          <TextInput
            label="Label"
            placeholder="Contoh: IG Toko Utama"
            size="sm"
            error={errors.label?.message}
            {...register("label")}
          />
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
    </Modal>
  );
}
