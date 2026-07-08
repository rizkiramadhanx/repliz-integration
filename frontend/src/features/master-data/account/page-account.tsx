import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import ModalAddAccount from "@/features/master-data/account/components/modal-add-account";
import ModalEditAccount from "@/features/master-data/account/components/modal-edit-account";
import ModalManageDelegations from "@/features/master-data/account/components/modal-manage-delegations";
import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import useMutateCheckConnection from "@/features/master-data/account/hooks/useMutateCheckConnection";
import useMutateDeleteAccount from "@/features/master-data/account/hooks/useMutateDeleteAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import dayjs from "@/libs/dayjs";
import {
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Input,
  Pagination,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

const CONNECTION_STATUS_COLOR: Record<string, string> = {
  connected: "green",
  disconnected: "gray",
  error: "red",
  unknown: "yellow",
};

export default function PageAccount() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState({
    keyword: "",
    page: 1,
    limit: 25,
  });
  const [inputSearch, setInputSearch] = useState("");

  const {
    data: dataAccount,
    isLoading,
    refetch,
    isSuccess,
  } = useGetAllAccount(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const onSuccessAdd = () => {
    setOpenAdd(false);
    refetch();
    notifications.show({
      title: "Sukses",
      message: "Account berhasil ditambahkan",
      color: "green",
    });
  };

  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] =
    useState<typeDataAccount | null>(null);
  const { mutate: deleteAccount, isPending: isPendingDelete } =
    useMutateDeleteAccount();

  const handleDeleteAccount = () => {
    if (!accountToDelete?.id) return;
    deleteAccount(accountToDelete.id, {
      onSuccess: () => {
        setModalDeleteOpen(false);
        setAccountToDelete(null);
        refetch();
        notifications.show({
          title: "Sukses",
          message: "Account berhasil dihapus",
          color: "green",
        });
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        const msg = axErr?.response?.data?.message ?? "Gagal menghapus akun";
        setModalDeleteOpen(false);
        notifications.show({ title: "Error", message: msg, color: "red" });
      },
    });
  };

  const [openEdit, setOpenEdit] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<typeDataAccount | null>(
    null,
  );
  const onSuccessEdit = () => {
    setOpenEdit(false);
    setAccountToEdit(null);
    refetch();
    notifications.show({
      title: "Sukses",
      message: "Account berhasil diubah",
      color: "green",
    });
  };

  const [openDelegations, setOpenDelegations] = useState(false);
  const [accountForDelegation, setAccountForDelegation] =
    useState<typeDataAccount | null>(null);

  const { mutate: checkConnection, isPending: isCheckingConnection } =
    useMutateCheckConnection();
  const [checkingAccountId, setCheckingAccountId] = useState<string | null>(
    null,
  );

  const handleCheckConnection = (account: typeDataAccount) => {
    setCheckingAccountId(account.id);
    checkConnection(account.id, {
      onSuccess: (res) => {
        setCheckingAccountId(null);
        refetch();
        if (res.data.ok) {
          notifications.show({
            title: "Sukses",
            message: `Koneksi "${account.label}" valid${res.data.username ? ` (@${res.data.username})` : ""}`,
            color: "green",
          });
        } else {
          notifications.show({
            title: "Gagal",
            message: res.data.error ?? "Koneksi tidak valid",
            color: "red",
          });
        }
      },
      onError: (err: unknown) => {
        setCheckingAccountId(null);
        const axErr = err as { response?: { data?: { message?: string } } };
        const msg = axErr?.response?.data?.message ?? "Gagal memeriksa koneksi";
        notifications.show({ title: "Error", message: msg, color: "red" });
      },
    });
  };

  const accounts = dataAccount?.data?.data ?? [];
  const meta = dataAccount?.data?.meta;
  const totalPages = meta?.total_page ?? 0;

  return (
    <Box px={20} py={10}>
      <Group mb="md">
        <Button
          variant="filled"
          color="primary"
          size="xs"
          onClick={() => navigate(-1)}
        >
          <TiArrowBack />
        </Button>
        <Text fw={600}>Master Data Account</Text>
      </Group>
      <Flex
        display="flex"
        direction={{ base: "column", md: "row" }}
        gap={10}
        mt={10}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Button
          w={{ base: "100%", md: "auto" }}
          onClick={() => setOpenAdd(true)}
          sx={{ marginTop: 1 }}
          color="primary"
          size="sm"
        >
          Tambah Account
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => {
            const val = e.target.value;
            setInputSearch(val);
            debouncedSearch(val);
          }}
          placeholder="Cari label akun..."
          value={inputSearch}
          w={{ base: "100%", md: "auto" }}
        />
      </Flex>
      <Table.ScrollContainer
        mt={10}
        minWidth={200}
        maxHeight="calc(100vh - 300px)"
      >
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Label</Table.Th>
              <Table.Th>Platform</Table.Th>
              <Table.Th>Status Koneksi</Table.Th>
              <Table.Th>Dibuat</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              accounts.length > 0 &&
              accounts.map((account: typeDataAccount) => (
                <Table.Tr key={account.id}>
                  <Table.Td>
                    {["facebook", "instagram", "twitter"].includes(
                      account.type,
                    ) && account.profile_url ? (
                      <Text
                        size="sm"
                        c="blue"
                        fw={500}
                        sx={{ cursor: "pointer", textDecoration: "underline" }}
                        onClick={() =>
                          window.open(account.profile_url!, "_blank", "noreferrer")
                        }
                      >
                        {account.label}
                      </Text>
                    ) : (
                      account.label
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" tt="capitalize">
                      {account.type}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        CONNECTION_STATUS_COLOR[account.connection_status] ??
                        "gray"
                      }
                      variant="light"
                    >
                      {account.connection_status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {account.created_at
                        ? dayjs(account.created_at).format("DD MMM YYYY, HH.mm")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Box sx={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <Tooltip label="Cek Koneksi">
                        <Button
                          color="blue"
                          size="xs"
                          loading={
                            isCheckingConnection &&
                            checkingAccountId === account.id
                          }
                          onClick={() => handleCheckConnection(account)}
                        >
                          Koneksi
                        </Button>
                      </Tooltip>
                      <Button
                        color="primary"
                        size="xs"
                        onClick={() => {
                          setAccountForDelegation(account);
                          setOpenDelegations(true);
                        }}
                      >
                        Akses
                      </Button>
                      <Button
                        color="blue"
                        size="xs"
                        onClick={() => {
                          setAccountToEdit(account);
                          setOpenEdit(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        onClick={() => {
                          setAccountToDelete(account);
                          setModalDeleteOpen(true);
                        }}
                      >
                        Hapus
                      </Button>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && accounts.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5} align="center" height={50}>
                  Tidak ada data ditemukan
                </Table.Td>
              </Table.Tr>
            )}
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={5} align="center" height={50}>
                  Loading...
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Flex
        mt={10}
        justify="space-between"
        align="center"
        px={20}
        wrap="wrap"
        gap="sm"
      >
        <PaginationTotal
          total={meta?.total ?? 0}
          page={filter.page}
          limit={filter.limit}
        />
        {isSuccess && totalPages > 0 && (
          <Pagination
            color="primary"
            value={filter.page}
            total={totalPages}
            onChange={(e) => setFilter((prev) => ({ ...prev, page: e }))}
          />
        )}
      </Flex>

      <ModalAddAccount
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={onSuccessAdd}
      />

      <ModalEditAccount
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setAccountToEdit(null);
        }}
        onSuccess={onSuccessEdit}
        defaultValue={accountToEdit}
      />

      <ModalManageDelegations
        open={openDelegations}
        onClose={() => {
          setOpenDelegations(false);
          setAccountForDelegation(null);
        }}
        accountId={accountForDelegation?.id ?? null}
        accountLabel={accountForDelegation?.label}
      />

      <ModalDeleteConfirmation
        open={modalDeleteOpen}
        onClose={() => {
          setModalDeleteOpen(false);
          setAccountToDelete(null);
        }}
        onSubmit={handleDeleteAccount}
        label="Yakin ingin menghapus account ini?"
        isDeleting={isPendingDelete}
        isSubmitDisabled={false}
      />
    </Box>
  );
}
