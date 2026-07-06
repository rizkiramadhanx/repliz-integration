import useGetAllUser from "@/features/master-data/user/hooks/useGetAllUser";
import useGetDelegations from "@/features/master-data/account/hooks/useGetDelegations";
import useMutateDelegateAccount from "@/features/master-data/account/hooks/useMutateDelegateAccount";
import useMutateRevokeDelegation from "@/features/master-data/account/hooks/useMutateRevokeDelegation";
import type { typeDataDelegation } from "@/features/master-data/account/type";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Select,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { MdDelete, MdOutlineClose } from "react-icons/md";

export default function ModalManageDelegations({
  open,
  onClose,
  accountId,
  accountLabel,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
  accountLabel?: string;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const {
    data: delegationData,
    isLoading: isLoadingDelegations,
    refetch,
  } = useGetDelegations(accountId);

  const { data: userData, isLoading: isLoadingUsers } = useGetAllUser({
    page: 1,
    limit: 100,
  });

  const { mutate: delegate, isPending: isDelegating } =
    useMutateDelegateAccount();
  const { mutate: revokeDelegation } = useMutateRevokeDelegation();

  const delegations = delegationData?.data ?? [];
  const existingUserIds = new Set(delegations.map((d) => d.user_id));

  const userOptions = (userData?.data ?? [])
    .filter((u) => !existingUserIds.has(u.id))
    .map((u) => ({ value: u.id, label: `${u.name ?? u.email} (${u.email})` }));

  const handleClose = () => {
    setSelectedUserId(null);
    onClose();
  };

  const handleAddDelegation = () => {
    if (!accountId || !selectedUserId) return;
    delegate(
      { accountId, payload: { userId: selectedUserId } },
      {
        onSuccess: () => {
          setSelectedUserId(null);
          refetch();
          notifications.show({
            title: "Sukses",
            message: "Akses berhasil diberikan",
            color: "green",
          });
        },
        onError: (err: unknown) => {
          const axErr = err as {
            response?: { data?: { message?: string } };
          };
          const msg =
            axErr?.response?.data?.message ?? "Gagal memberikan akses";
          notifications.show({ title: "Error", message: msg, color: "red" });
        },
      },
    );
  };

  const handleRevoke = (delegationId: string) => {
    if (!accountId) return;
    revokeDelegation(
      { accountId, delegationId },
      {
        onSuccess: () => {
          refetch();
          notifications.show({
            title: "Sukses",
            message: "Akses berhasil dicabut",
            color: "green",
          });
        },
        onError: () => {
          notifications.show({
            title: "Error",
            message: "Gagal mencabut akses",
            color: "red",
          });
        },
      },
    );
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={`Kelola Akses — ${accountLabel ?? ""}`}
      size="lg"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
    >
      <Text size="xs" c="dimmed" mb="sm">
        Siapa saja yang diberi akses di sini bisa memakai akun ini sepenuhnya,
        termasuk menambah/mencabut akses user lain.
      </Text>
      <Table.ScrollContainer minWidth={300}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoadingDelegations && (
              <Table.Tr>
                <Table.Td colSpan={2} align="center">
                  Loading...
                </Table.Td>
              </Table.Tr>
            )}
            {!isLoadingDelegations && delegations.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={2} align="center">
                  Belum ada user yang diberi akses
                </Table.Td>
              </Table.Tr>
            )}
            {delegations.map((d: typeDataDelegation) => (
              <Table.Tr key={d.id}>
                <Table.Td>
                  <Text size="sm">{d.user.name ?? d.user.email}</Text>
                  <Text size="xs" c="dimmed">
                    {d.user.email}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRevoke(d.id)}
                  >
                    <MdDelete />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Box mt="md" pt="md" style={{ borderTop: "1px solid #e0e0e0" }}>
        <Text size="sm" fw={600} mb="xs">
          Berikan Akses Baru
        </Text>
        <Group align="end" wrap="nowrap">
          <Select
            placeholder="Pilih user"
            data={userOptions}
            value={selectedUserId}
            onChange={setSelectedUserId}
            disabled={isLoadingUsers}
            searchable
            flex={1}
          />
          <Button
            color="primary"
            onClick={handleAddDelegation}
            disabled={!selectedUserId || isDelegating}
            loading={isDelegating}
          >
            Tambah
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}
