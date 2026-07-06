import useMutateAddItem from "@/features/master-data/item/hooks/useMutateAddItem";
import useGetAllCategory from "@/features/master-data/category/hooks/useGetAllCategory";
import useGetAllBrand from "@/features/master-data/brand/hooks/useGetAllBrand";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Controller, useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nama item wajib diisi").max(255),
  weight: z.number({ invalid_type_error: "Berat wajib diisi" }).min(0, "Berat minimal 0"),
  category_id: z.string().nullable().optional(),
  brand_id: z.string().nullable().optional(),
});
type Schema = z.infer<typeof schema>;

export default function ModalAddItem({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<Schema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: "", weight: 0, category_id: null, brand_id: null },
  });

  const { mutate, isPending } = useMutateAddItem();
  const { data: categoryData } = useGetAllCategory({ limit: 100 });
  const { data: brandData } = useGetAllBrand({ limit: 100 });

  const categoryOptions = (categoryData?.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const brandOptions = (brandData?.data?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = (data: Schema) => {
    mutate({ name: data.name, weight: data.weight, category_id: data.category_id ?? null, brand_id: data.brand_id ?? null }, {
      onSuccess: () => { reset(); handleClose(); onSuccess(); },
      onError: () => notifications.show({ title: "Error", message: "Gagal membuat item", color: "red" }),
    });
  };

  return (
    <Modal opened={open} onClose={handleClose} title="Tambah Item" centered withCloseButton closeButtonProps={{ icon: <MdOutlineClose /> }}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
          <TextInput label="Nama Item" placeholder="Contoh: Gelang 10gr" error={errors.name?.message} {...register("name")} />
          <Controller
            name="weight"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Berat (gram)"
                placeholder="0"
                min={0}
                error={errors.weight?.message}
                value={field.value}
                onChange={(val) => field.onChange(typeof val === "number" ? val : 0)}
              />
            )}
          />
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Kategori (opsional)"
                placeholder="Pilih kategori"
                data={categoryOptions}
                clearable
                value={field.value ?? null}
                onChange={(val) => field.onChange(val ?? null)}
                error={errors.category_id?.message}
              />
            )}
          />
          <Controller
            name="brand_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Brand (opsional)"
                placeholder="Pilih brand"
                data={brandOptions}
                clearable
                value={field.value ?? null}
                onChange={(val) => field.onChange(val ?? null)}
                error={errors.brand_id?.message}
              />
            )}
          />
        </Stack>
        <Group justify="end" mt="lg">
          <Button variant="outline" color="gray" onClick={handleClose}>Batal</Button>
          <Button type="submit" color="primary" disabled={!isValid || isPending} loading={isPending}>Simpan</Button>
        </Group>
      </form>
    </Modal>
  );
}
