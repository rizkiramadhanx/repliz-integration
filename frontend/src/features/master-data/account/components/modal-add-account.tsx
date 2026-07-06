import CredentialsFields from "@/features/master-data/account/components/credentials-fields";
import { defaultCredentials } from "@/features/master-data/account/utils/default-credentials";
import useMutateAddAccount from "@/features/master-data/account/hooks/useMutateAddAccount";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, Select, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "telegram", label: "Telegram" },
  { value: "facebook", label: "Facebook" },
  { value: "discord", label: "Discord" },
];

const schema = z.object({
  label: z.string().min(1, "Label wajib diisi").max(255),
  type: z.enum(["instagram", "twitter", "telegram", "facebook", "discord"], {
    errorMap: () => ({ message: "Pilih tipe akun" }),
  }),
  credentials: z.record(z.string(), z.unknown()),
});

export type AddAccountSchema = z.infer<typeof schema>;

export default function ModalAddAccount({
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
  } = useForm<AddAccountSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      label: "",
      type: "instagram",
      credentials: defaultCredentials("instagram"),
    },
  });

  const typeValue = watch("type");
  const credentialsValue = watch("credentials");
  const { mutate, isPending } = useMutateAddAccount();

  const handleTypeChange = (next: AddAccountSchema["type"]) => {
    setValue("type", next, { shouldValidate: true });
    setValue("credentials", defaultCredentials(next), {
      shouldValidate: true,
    });
  };

  const handleFormClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (dataForm: AddAccountSchema) => {
    mutate(
      {
        label: dataForm.label,
        type: dataForm.type,
        credentials: dataForm.credentials,
      },
      {
        onSuccess: () => {
          reset();
          handleFormClose();
          onSuccess();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          const msg = axErr?.response?.data?.message ?? "Gagal membuat akun";
          notifications.show({ title: "Error", message: msg, color: "red" });
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleFormClose}
      title="Tambah Account"
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
          <Select
            label="Tipe Platform"
            placeholder="Pilih platform"
            data={ACCOUNT_TYPE_OPTIONS}
            value={typeValue}
            onChange={(val) =>
              val && handleTypeChange(val as AddAccountSchema["type"])
            }
            error={errors.type?.message}
            allowDeselect={false}
          />
          <CredentialsFields
            type={typeValue}
            value={credentialsValue}
            onChange={(next) =>
              setValue("credentials", next, { shouldValidate: true })
            }
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
