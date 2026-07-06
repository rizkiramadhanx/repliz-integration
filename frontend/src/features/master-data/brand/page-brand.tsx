import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import ModalAddBrand from "@/features/master-data/brand/components/modal-add-brand";
import ModalEditBrand from "@/features/master-data/brand/components/modal-edit-brand";
import useGetAllBrand from "@/features/master-data/brand/hooks/useGetAllBrand";
import useMutateDeleteBrand from "@/features/master-data/brand/hooks/useMutateDeleteBrand";
import type { typeDataBrand } from "@/features/master-data/brand/type";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import dayjs from "@/libs/dayjs";
import { Box, Button, Flex, Group, Input, Pagination, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

export default function PageBrand() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState({ keyword: "", page: 1, limit: 25 });
  const [inputSearch, setInputSearch] = useState("");

  const { data, isLoading, refetch, isSuccess } = useGetAllBrand(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<typeDataBrand | null>(null);
  const { mutate: deleteBrand, isPending: isPendingDelete } = useMutateDeleteBrand();

  const handleDelete = () => {
    if (!toDelete?.id) return;
    deleteBrand(toDelete.id, {
      onSuccess: () => {
        setModalDeleteOpen(false);
        setToDelete(null);
        refetch();
        notifications.show({ title: "Sukses", message: "Brand berhasil dihapus", color: "green" });
      },
      onError: () => {
        setModalDeleteOpen(false);
        notifications.show({ title: "Error", message: "Gagal menghapus brand", color: "red" });
      },
    });
  };

  const [openEdit, setOpenEdit] = useState(false);
  const [toEdit, setToEdit] = useState<typeDataBrand | null>(null);

  const brands = data?.data?.data ?? [];
  const metadata = data?.data?.metadata;
  const totalPages = metadata?.totalPages ?? 0;

  return (
    <Box px={20} py={10}>
      <Group mb="md">
        <Button variant="filled" color="primary" size="xs" onClick={() => navigate(-1)}>
          <TiArrowBack />
        </Button>
        <Text fw={600}>Master Data Brand</Text>
      </Group>
      <Flex direction={{ base: "column", md: "row" }} gap={10} mt={10} sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Button w={{ base: "100%", md: "auto" }} onClick={() => setOpenAdd(true)} color="primary" size="sm">
          Tambah Brand
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => { const val = e.target.value; setInputSearch(val); debouncedSearch(val); }}
          placeholder="Cari nama brand..."
          value={inputSearch}
          w={{ base: "100%", md: "auto" }}
        />
      </Flex>
      <Table.ScrollContainer mt={10} minWidth={200} maxHeight="calc(100vh - 300px)">
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nama</Table.Th>
              <Table.Th>Dibuat</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess && brands.map((item: typeDataBrand) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td><Text size="sm">{item.created_at ? dayjs(item.created_at).format("DD MMM YYYY, HH.mm") : "-"}</Text></Table.Td>
                <Table.Td>
                  <Box sx={{ display: "flex", gap: 5 }}>
                    <Button color="blue" size="sm" onClick={() => { setToEdit(item); setOpenEdit(true); }}>Edit</Button>
                    <Button size="sm" color="red" onClick={() => { setToDelete(item); setModalDeleteOpen(true); }}>Hapus</Button>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ))}
            {isSuccess && brands.length === 0 && (
              <Table.Tr><Table.Td colSpan={3} align="center" height={50}>Tidak ada data ditemukan</Table.Td></Table.Tr>
            )}
            {isLoading && (
              <Table.Tr><Table.Td colSpan={3} align="center" height={50}>Loading...</Table.Td></Table.Tr>
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

      <ModalAddBrand open={openAdd} onClose={() => setOpenAdd(false)} onSuccess={() => { setOpenAdd(false); refetch(); notifications.show({ title: "Sukses", message: "Brand berhasil ditambahkan", color: "green" }); }} />
      <ModalEditBrand open={openEdit} onClose={() => { setOpenEdit(false); setToEdit(null); }} onSuccess={() => { setOpenEdit(false); setToEdit(null); refetch(); }} defaultValue={toEdit} />
      <ModalDeleteConfirmation open={modalDeleteOpen} onClose={() => { setModalDeleteOpen(false); setToDelete(null); }} onSubmit={handleDelete} label="Yakin ingin menghapus brand ini?" isDeleting={isPendingDelete} isSubmitDisabled={false} />
    </Box>
  );
}
