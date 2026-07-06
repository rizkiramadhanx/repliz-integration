import useMutateEditItem from "@/features/master-data/item/hooks/useMutateEditItem";
import useGetAllCategory from "@/features/master-data/category/hooks/useGetAllCategory";
import useGetAllBrand from "@/features/master-data/brand/hooks/useGetAllBrand";
import type { typeDataItem } from "@/features/master-data/item/type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
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

export default function ModalEditItem({
  open,
  onClose,
  onSuccess,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValue: typeDataItem | null;
}) {
  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<Schema>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutateEditItem();
  const { data: categoryData } = useGetAllCategory({ limit: 100 });
  const { data: brandData } = useGetAllBrand({ limit: 100 });

  const categoryOptions = (categoryData?.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const brandOptions = (brandData?.data?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  useEffect(() => {
    if (open && defaultValue) {
      reset({
        name: defaultValue.name,
        weight: defaultValue.weight,
        category_id: defaultValue.category_id ?? null,
        brand_id: defaultValue.brand_id ?? null,
      });
    }
  }, [open, defaultValue, reset]);

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = (data: Schema) => {
    if (!defaultValue?.id) return;
    mutate({ id: defaultValue.id, payload: { name: data.name, weight: data.weight, category_id: data.category_id ?? null, brand_id: data.brand_id ?? null } }, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Item berhasil diubah", color: "green" });
        reset(); handleClose(); onSuccess();
      },
      onError: () => notifications.show({ title: "Error", message: "Gagal mengubah item", color: "red" }),
    });
  };

  return (
    <Modal opened={open} onClose={handleClose} title="Edit Item" centered withCloseButton closeButtonProps={{ icon: <MdOutlineClose /> }}>
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
