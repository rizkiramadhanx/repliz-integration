import useMutateEditBrand from "@/features/master-data/brand/hooks/useMutateEditBrand";
import type { typeDataBrand } from "@/features/master-data/brand/type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nama brand wajib diisi").max(255),
});
type Schema = z.infer<typeof schema>;

export default function ModalEditBrand({
  open,
  onClose,
  onSuccess,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValue: typeDataBrand | null;
}) {
  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<Schema>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutateEditBrand();

  useEffect(() => {
    if (open && defaultValue) reset({ name: defaultValue.name });
  }, [open, defaultValue, reset]);

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = (data: Schema) => {
    if (!defaultValue?.id) return;
    mutate({ id: defaultValue.id, payload: data }, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Brand berhasil diubah", color: "green" });
        reset(); handleClose(); onSuccess();
      },
      onError: () => notifications.show({ title: "Error", message: "Gagal mengubah brand", color: "red" }),
    });
  };

  return (
    <Modal opened={open} onClose={handleClose} title="Edit Brand" centered withCloseButton closeButtonProps={{ icon: <MdOutlineClose /> }}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
          <TextInput label="Nama Brand" placeholder="Contoh: Antam, UBS" error={errors.name?.message} {...register("name")} />
        </Stack>
        <Group justify="end" mt="lg">
          <Button variant="outline" color="gray" onClick={handleClose}>Batal</Button>
          <Button type="submit" color="primary" disabled={!isValid || isPending} loading={isPending}>Simpan</Button>
        </Group>
      </form>
    </Modal>
  );
}
