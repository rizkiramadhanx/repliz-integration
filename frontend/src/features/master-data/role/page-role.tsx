import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import ModalAddRole from "@/features/master-data/role/components/modal-add-role";
import ModalEditRole from "@/features/master-data/role/components/modal-edit-role";
import useGetAllRole from "@/features/master-data/role/hooks/useGetAllRole";
import useMutateDeleteRole from "@/features/master-data/role/hooks/useMutateDeleteRole";
import type { typeDataRole } from "@/features/master-data/role/type";
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

export default function PageRole() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState({
    keyword: "",
    page: 1,
    limit: 25,
  });
  const [inputSearch, setInputSearch] = useState("");

  const {
    data: dataRole,
    isLoading,
    refetch,
    isSuccess,
  } = useGetAllRole(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const onSuccessAdd = () => {
    setOpenAdd(false);
    refetch(); 
    notifications.show({
      title: "Sukses",
      message: "Role berhasil ditambahkan",
      color: "green",
    });
  };

  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<typeDataRole | null>(null);
  const { mutate: deleteRole, isPending: isPendingDelete } =
    useMutateDeleteRole();

  const handleDeleteRole = () => {
    if (!roleToDelete?.id) return;
    deleteRole(roleToDelete.id, {
      onSuccess: () => {
        setModalDeleteOpen(false);
        setRoleToDelete(null);
        refetch();
        notifications.show({
          title: "Sukses",
          message: "Role berhasil dihapus",
          color: "green",
        });
      },
      onError: () => {
        setModalDeleteOpen(false);
        notifications.show({
          title: "Error",
          message: "Gagal menghapus role",
          color: "red",
        });
      },
    });
  };

  const [openEdit, setOpenEdit] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<typeDataRole | null>(null);
  const onSuccessEdit = () => {
    setOpenEdit(false);
    setRoleToEdit(null);
    refetch();
  };

  const roles = dataRole?.data?.data ?? [];
  const metadata = dataRole?.data?.metadata;
  const totalPages = metadata?.totalPages ?? 0;

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
        <Text fw={600}>Master Data Role</Text>
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
          Tambah Role
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => {
            const val = e.target.value;
            setInputSearch(val);
            debouncedSearch(val);
          }}
          placeholder="Cari nama role..."
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
              <Table.Th>Nama</Table.Th>
              <Table.Th>Dibuat</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              roles.length > 0 &&
              roles.map((role: typeDataRole) => (
                <Table.Tr key={role.id}>
                  <Table.Td>{role.name}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{role.created_at ? dayjs(role.created_at).format("DD MMM YYYY, HH.mm") : "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Box sx={{ display: "flex", gap: 5 }}>
                      <Button
                        color="blue"
                        size="sm"
                        onClick={() => {
                          setRoleToEdit(role);
                          setOpenEdit(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        color="red"
                        onClick={() => {
                          setRoleToDelete(role);
                          setModalDeleteOpen(true);
                        }}
                      >
                        Hapus
                      </Button>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && roles.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3} align="center" height={50}>
                  Tidak ada data ditemukan
                </Table.Td>
              </Table.Tr>
            )}
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={3} align="center" height={50}>
                  Loading...
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Flex mt={10} justify="space-between" align="center" px={20} wrap="wrap" gap="sm">
        <PaginationTotal
          total={metadata?.total ?? 0}
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

      <ModalAddRole
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={onSuccessAdd}
      />

      <ModalEditRole
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setRoleToEdit(null);
        }}
        onSuccess={onSuccessEdit}
        defaultValue={roleToEdit}
      />

      <ModalDeleteConfirmation
        open={modalDeleteOpen}
        onClose={() => {
          setModalDeleteOpen(false);
          setRoleToDelete(null);
        }}
        onSubmit={handleDeleteRole}
        label="Yakin ingin menghapus role ini?"
        isDeleting={isPendingDelete}
        isSubmitDisabled={false}
      />
    </Box>
  );
}
