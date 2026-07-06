import useGetListAction from "@/features/master-data/role/hooks/useGetListAction";
import useMutateAddRole from "@/features/master-data/role/hooks/useMutateAddRole";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Group,
  Loader,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "react-hook-form";
import { MdOutlineClose } from "react-icons/md";
import { z } from "zod";

const schema = z.object({
  name: z
    .string()
    .min(1, "Nama role wajib diisi")
    .max(100, "Nama role maksimal 100 karakter"),
  actions: z.array(z.string()).min(1, "Pilih minimal satu aksi"),
});

export type AddRoleSchema = z.infer<typeof schema>;

export default function ModalAddRole({
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
  } = useForm<AddRoleSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      actions: [],
    },
  });

  const selectedActions = watch("actions");

  const { data: listActionData, isLoading: isLoadingActions } =
    useGetListAction();
  const { mutate, isPending: isSubmitting } = useMutateAddRole();

  const listActions = listActionData?.data ?? [];

  const toggleAction = (actionKey: string, checked: boolean) => {
    if (checked) {
      setValue("actions", [...selectedActions, actionKey], {
        shouldValidate: true,
      });
    } else {
      setValue(
        "actions",
        selectedActions.filter((a) => a !== actionKey),
        { shouldValidate: true },
      );
    }
  };

  const handleFormClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (dataForm: AddRoleSchema) => {
    mutate(
      {
        name: dataForm.name,
        actions: dataForm.actions,
      },
      {
        onSuccess: () => {
          reset();
          handleFormClose();
          onSuccess();
        },
        onError: () => {
          notifications.show({
            title: "Error",
            message: "Gagal membuat role",
            color: "red",
          });
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleFormClose}
      title="Tambah Role"
      size="xl"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label="Nama Role"
            placeholder="Contoh: Manager, Staff"
            size="sm"
            error={errors.name?.message}
            {...register("name")}
          />

          <Text fw={500} size="sm">
            Modul & Akses
          </Text>
          {isLoadingActions ? (
            <Loader size="sm" />
          ) : (
            <ScrollArea h={400} type="auto" offsetScrollbars>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                {listActions.map((item) => (
                  <Stack key={item.name} gap="xs">
                    <Text fw={600} size="sm">
                      {item.name}
                    </Text>
                    {item.actions?.length ? (
                      <Stack gap={4}>
                        {item.actions.map((action) => (
                          <Group key={action} gap="xs" wrap="nowrap">
                            <Switch
                              color="primary"
                              size="sm"
                              checked={selectedActions.includes(action)}
                              onChange={(e) =>
                                toggleAction(action, e.currentTarget.checked)
                              }
                            />
                            <Text size="xs" lineClamp={1} title={action}>
                              {action}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="xs" c="dimmed">
                        Tidak ada action
                      </Text>
                    )}
                  </Stack>
                ))}
              </SimpleGrid>
            </ScrollArea>
          )}
          {errors.actions?.message && (
            <Text size="xs" c="red">
              {errors.actions.message}
            </Text>
          )}
        </Stack>

        <Group justify="end" mt="lg">
          <Button variant="outline" color="gray" onClick={handleFormClose}>
            Batal
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={!isValid || isSubmitting}
            loading={isSubmitting}
          >
            Simpan
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
