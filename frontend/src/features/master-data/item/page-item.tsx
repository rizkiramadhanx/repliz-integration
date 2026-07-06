import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import ModalAddItem from "@/features/master-data/item/components/modal-add-item";
import ModalEditItem from "@/features/master-data/item/components/modal-edit-item";
import useGetAllItem from "@/features/master-data/item/hooks/useGetAllItem";
import useMutateDeleteItem from "@/features/master-data/item/hooks/useMutateDeleteItem";
import type { typeDataItem } from "@/features/master-data/item/type";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import dayjs from "@/libs/dayjs";
import { Box, Button, Flex, Group, Input, Pagination, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

export default function PageItem() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState({ keyword: "", page: 1, limit: 25 });
  const [inputSearch, setInputSearch] = useState("");

  const { data, isLoading, refetch, isSuccess } = useGetAllItem(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<typeDataItem | null>(null);
  const { mutate: deleteItem, isPending: isPendingDelete } = useMutateDeleteItem();

  const handleDelete = () => {
    if (!toDelete?.id) return;
    deleteItem(toDelete.id, {
      onSuccess: () => {
        setModalDeleteOpen(false);
        setToDelete(null);
        refetch();
        notifications.show({ title: "Sukses", message: "Item berhasil dihapus", color: "green" });
      },
      onError: () => {
        setModalDeleteOpen(false);
        notifications.show({ title: "Error", message: "Gagal menghapus item", color: "red" });
      },
    });
  };

  const [openEdit, setOpenEdit] = useState(false);
  const [toEdit, setToEdit] = useState<typeDataItem | null>(null);

  const items = data?.data?.data ?? [];
  const metadata = data?.data?.metadata;
  const totalPages = metadata?.totalPages ?? 0;

  return (
    <Box px={20} py={10}>
      <Group mb="md">
        <Button variant="filled" color="primary" size="xs" onClick={() => navigate(-1)}>
          <TiArrowBack />
        </Button>
        <Text fw={600}>Master Data Item</Text>
      </Group>
      <Flex direction={{ base: "column", md: "row" }} gap={10} mt={10} sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Button w={{ base: "100%", md: "auto" }} onClick={() => setOpenAdd(true)} color="primary" size="sm">
          Tambah Item
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => { const val = e.target.value; setInputSearch(val); debouncedSearch(val); }}
          placeholder="Cari nama item..."
          value={inputSearch}
          w={{ base: "100%", md: "auto" }}
        />
      </Flex>
      <Table.ScrollContainer mt={10} minWidth={400} maxHeight="calc(100vh - 300px)">
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nama</Table.Th>
              <Table.Th>Berat (gr)</Table.Th>
              <Table.Th>Kategori</Table.Th>
              <Table.Th>Brand</Table.Th>
              <Table.Th>Dibuat</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess && items.map((item: typeDataItem) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{item.weight}</Table.Td>
                <Table.Td>{item.category?.name ?? "-"}</Table.Td>
                <Table.Td>{item.brand?.name ?? "-"}</Table.Td>
                <Table.Td><Text size="sm">{item.created_at ? dayjs(item.created_at).format("DD MMM YYYY, HH.mm") : "-"}</Text></Table.Td>
                <Table.Td>
                  <Box sx={{ display: "flex", gap: 5 }}>
                    <Button color="blue" size="sm" onClick={() => { setToEdit(item); setOpenEdit(true); }}>Edit</Button>
                    <Button size="sm" color="red" onClick={() => { setToDelete(item); setModalDeleteOpen(true); }}>Hapus</Button>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ))}
            {isSuccess && items.length === 0 && (
              <Table.Tr><Table.Td colSpan={6} align="center" height={50}>Tidak ada data ditemukan</Table.Td></Table.Tr>
            )}
            {isLoading && (
              <Table.Tr><Table.Td colSpan={6} align="center" height={50}>Loading...</Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Flex mt={10} justify="space-between" align="center" px={20} wrap="wrap" gap="sm">
        <PaginationTotal total={metadata?.total ?? 0} page={filter.page} limit={filter.limit} />
        {isSuccess && totalPages > 0 && (
          <Pagination color="primary" value={filter.page} total={totalPages} onChange={(e) => setFilter((prev) => ({ ...prev, page: e }))} />
        )}
      </Flex>

      <ModalAddItem open={openAdd} onClose={() => setOpenAdd(false)} onSuccess={() => { setOpenAdd(false); refetch(); notifications.show({ title: "Sukses", message: "Item berhasil ditambahkan", color: "green" }); }} />
      <ModalEditItem open={openEdit} onClose={() => { setOpenEdit(false); setToEdit(null); }} onSuccess={() => { setOpenEdit(false); setToEdit(null); refetch(); }} defaultValue={toEdit} />
      <ModalDeleteConfirmation open={modalDeleteOpen} onClose={() => { setModalDeleteOpen(false); setToDelete(null); }} onSubmit={handleDelete} label="Yakin ingin menghapus item ini?" isDeleting={isPendingDelete} isSubmitDisabled={false} />
    </Box>
  );
}
