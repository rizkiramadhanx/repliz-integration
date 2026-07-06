import useGetAllRole from "@/features/master-data/role/hooks/useGetAllRole";
import useMutateEditUser from "@/features/master-data/user/hooks/useMutateEditUser";
import type { typeDataUser } from "@/features/master-data/user/type";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().optional(),
  role_id: z.string().optional(),
});

export type EditUserSchema = z.infer<typeof schema>;

export default function ModalEditUser({
  open,
  onClose,
  onSuccess,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValue: typeDataUser | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<EditUserSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role_id: undefined,
    },
  });

  const roleIdValue = watch("role_id");
  const { data: roleData, isLoading: isLoadingRoles } = useGetAllRole({
    page: 1,
    limit: 100,
    keyword: "",
  });
  const { mutate, isPending } = useMutateEditUser();

  const roleOptions =
    roleData?.data?.data?.map((r) => ({ value: r.id, label: r.name })) ?? [];

  useEffect(() => {
    if (defaultValue) {
      reset({
        name: defaultValue.name,
        email: defaultValue.email,
        password: "",
        role_id: defaultValue.role_id || undefined,
      });
    }
  }, [defaultValue, reset]);

  const handleFormClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (dataForm: EditUserSchema) => {
    if (!defaultValue?.id) return;
    mutate(
      {
        id: defaultValue.id,
        name: dataForm.name,
        email: dataForm.email,
        password: dataForm.password || undefined,
        role_id: dataForm.role_id || undefined,
      },
      {
        onSuccess: () => {
          reset();
          handleFormClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          const msg =
            axErr?.response?.data?.message ?? "Gagal mengubah user";
          notifications.show({
            title: "Error",
            message: msg,
            color: "red",
          });
        },
      }
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleFormClose}
      title="Edit User"
      size="md"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          <TextInput
            label="Nama"
            placeholder="Nama lengkap"
            size="sm"
            error={errors.name?.message}
            {...register("name")}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="email@example.com"
            size="sm"
            error={errors.email?.message}
            {...register("email")}
          />
          <PasswordInput
            label="Password (kosongkan jika tidak diubah)"
            placeholder="Minimal 8 karakter"
            size="sm"
            error={errors.password?.message}
            {...register("password")}
          />
          {isLoadingRoles ? (
            <Loader size="sm" />
          ) : (
            <Select
              label="Role"
              placeholder="Pilih role (opsional)"
              data={roleOptions}
              value={roleIdValue}
              onChange={(val) => setValue("role_id", val ?? undefined)}
              clearable
            />
          )}
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
