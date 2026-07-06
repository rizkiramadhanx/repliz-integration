import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import ModalAddUser from "@/features/master-data/user/components/modal-add-user";
import ModalEditUser from "@/features/master-data/user/components/modal-edit-user";
import useGetAllUser from "@/features/master-data/user/hooks/useGetAllUser";
import useMutateDeleteUser from "@/features/master-data/user/hooks/useMutateDeleteUser";
import type { typeDataUser } from "@/features/master-data/user/type";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import dayjs from "@/libs/dayjs";
import {
  Box,
  Button,
  Flex,
  Group,
  Input,
  Pagination,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

export default function PageUser() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState({
    keyword: "",
    page: 1,
    limit: 25,
  });
  const [inputSearch, setInputSearch] = useState("");

  const {
    data: dataUser,
    isLoading,
    refetch,
    isSuccess,
  } = useGetAllUser(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const onSuccessAdd = () => {
    setOpenAdd(false);
    refetch();
    notifications.show({
      title: "Sukses",
      message: "User berhasil ditambahkan",
      color: "green",
    });
  };

  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<typeDataUser | null>(null);
  const { mutate: deleteUser, isPending: isPendingDelete } =
    useMutateDeleteUser();

  const handleDeleteUser = () => {
    if (!userToDelete?.id) return;
    deleteUser(userToDelete.id, {
      onSuccess: () => {
        setModalDeleteOpen(false);
        setUserToDelete(null);
        refetch();
        notifications.show({
          title: "Sukses",
          message: "User berhasil dihapus",
          color: "green",
        });
      },
      onError: () => {
        setModalDeleteOpen(false);
        notifications.show({
          title: "Error",
          message: "Gagal menghapus user",
          color: "red",
        });
      },
    });
  };

  const [openEdit, setOpenEdit] = useState(false);
  const [userToEdit, setUserToEdit] = useState<typeDataUser | null>(null);
  const onSuccessEdit = () => {
    setOpenEdit(false);
    setUserToEdit(null);
    refetch();
    notifications.show({
      title: "Sukses",
      message: "User berhasil diubah",
      color: "green",
    });
  };

  const users = dataUser?.data ?? [];
  const meta = dataUser?.meta;
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
        <Text fw={600}>Master Data User</Text>
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
          Tambah User
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => {
            const val = e.target.value;
            setInputSearch(val);
            debouncedSearch(val);
          }}
          placeholder="Cari nama user..."
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
              <Table.Th>User</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Dibuat</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              users.length > 0 &&
              users.map((user: typeDataUser) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Text size="sm">{user.name}</Text>
                  </Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td>
                    {user.role ? (
                      <Group gap={4}>
                        <Text size="sm">{user.role.name}</Text>
                        {user.role.isAdmin && (
                          <Text size="xs" c="dimmed">
                            (Admin)
                          </Text>
                        )}
                      </Group>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {user.created_at
                        ? dayjs(user.created_at).format("DD MMM YYYY, HH.mm")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Box sx={{ display: "flex", gap: 5 }}>
                      <Button
                        color="blue"
                        size="sm"
                        onClick={() => {
                          setUserToEdit(user);
                          setOpenEdit(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        color="red"
                        onClick={() => {
                          setUserToDelete(user);
                          setModalDeleteOpen(true);
                        }}
                      >
                        Hapus
                      </Button>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && users.length === 0 && (
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
            siblings={4}
            onChange={(e) => setFilter((prev) => ({ ...prev, page: e }))}
          />
        )}
      </Flex>

      <ModalAddUser
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={onSuccessAdd}
      />

      <ModalEditUser
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setUserToEdit(null);
        }}
        onSuccess={onSuccessEdit}
        defaultValue={userToEdit}
      />

      <ModalDeleteConfirmation
        open={modalDeleteOpen}
        onClose={() => {
          setModalDeleteOpen(false);
          setUserToDelete(null);
        }}
        onSubmit={handleDeleteUser}
        label="Yakin ingin menghapus user ini?"
        isDeleting={isPendingDelete}
        isSubmitDisabled={false}
      />
    </Box>
  );
}
