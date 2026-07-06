import useMutateAddBrand from "@/features/master-data/brand/hooks/useMutateAddBrand";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nama brand wajib diisi").max(255),
});
type Schema = z.infer<typeof schema>;

export default function ModalAddBrand({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<Schema>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutateAddBrand();

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = (data: Schema) => {
    mutate(data, {
      onSuccess: () => { reset(); handleClose(); onSuccess(); },
      onError: () => notifications.show({ title: "Error", message: "Gagal membuat brand", color: "red" }),
    });
  };

  return (
    <Modal opened={open} onClose={handleClose} title="Tambah Brand" centered withCloseButton closeButtonProps={{ icon: <MdOutlineClose /> }}>
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
