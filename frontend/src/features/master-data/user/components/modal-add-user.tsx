import useGetAllRole from "@/features/master-data/role/hooks/useGetAllRole";
import useMutateAddUser from "@/features/master-data/user/hooks/useMutateAddUser";
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
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter"),
    role_id: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password dan konfirmasi password harus sama",
    path: ["confirmPassword"],
  });

export type AddUserSchema = z.infer<typeof schema>;

export default function ModalAddUser({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<AddUserSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role_id: undefined,
    },
  });

  const roleIdValue = watch("role_id");
  const { data: roleData, isLoading: isLoadingRoles } = useGetAllRole({
    page: 1,
    limit: 100,
    keyword: "",
  });
  const { mutate, isPending } = useMutateAddUser();

  const roleOptions =
    roleData?.data?.data?.map((r) => ({ value: r.id, label: r.name })) ?? [];

  const handleFormClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (dataForm: AddUserSchema) => {
    mutate(
      {
        name: dataForm.name,
        email: dataForm.email,
        password: dataForm.password,
        confirmPassword: dataForm.confirmPassword,
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
            axErr?.response?.data?.message ?? "Gagal membuat user";
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
      title="Tambah User"
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
            label="Password"
            placeholder="Minimal 8 karakter"
            size="sm"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordInput
            label="Konfirmasi Password"
            placeholder="Ulangi password"
            size="sm"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
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
