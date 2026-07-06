import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import ModalAddAutoPostRule from "@/features/master-data/auto-post-rule/components/modal-add-auto-post-rule";
import ModalEditAutoPostRule from "@/features/master-data/auto-post-rule/components/modal-edit-auto-post-rule";
import useGetAllAutoPostRule from "@/features/master-data/auto-post-rule/hooks/useGetAllAutoPostRule";
import useMutateDeleteAutoPostRule from "@/features/master-data/auto-post-rule/hooks/useMutateDeleteAutoPostRule";
import useMutateRunNowAutoPostRule from "@/features/master-data/auto-post-rule/hooks/useMutateRunNowAutoPostRule";
import type { typeDataAutoPostRule } from "@/features/master-data/auto-post-rule/type";
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

export default function PageAutoPostRule() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState({
    keyword: "",
    page: 1,
    limit: 25,
  });
  const [inputSearch, setInputSearch] = useState("");

  const {
    data: dataRule,
    isLoading,
    refetch,
    isSuccess,
  } = useGetAllAutoPostRule(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const onSuccessAdd = () => {
    setOpenAdd(false);
    refetch();
    notifications.show({
      title: "Sukses",
      message: "Auto post rule berhasil ditambahkan",
      color: "green",
    });
  };

  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] =
    useState<typeDataAutoPostRule | null>(null);
  const { mutate: deleteRule, isPending: isPendingDelete } =
    useMutateDeleteAutoPostRule();

  const handleDeleteRule = () => {
    if (!ruleToDelete?.id) return;
    deleteRule(ruleToDelete.id, {
      onSuccess: () => {
        setModalDeleteOpen(false);
        setRuleToDelete(null);
        refetch();
        notifications.show({
          title: "Sukses",
          message: "Auto post rule berhasil dihapus",
          color: "green",
        });
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        const msg =
          axErr?.response?.data?.message ?? "Gagal menghapus auto post rule";
        setModalDeleteOpen(false);
        notifications.show({ title: "Error", message: msg, color: "red" });
      },
    });
  };

  const [openEdit, setOpenEdit] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<typeDataAutoPostRule | null>(
    null,
  );
  const onSuccessEdit = () => {
    setOpenEdit(false);
    setRuleToEdit(null);
    refetch();
    notifications.show({
      title: "Sukses",
      message: "Auto post rule berhasil diubah",
      color: "green",
    });
  };

  const { mutate: runNow, isPending: isRunningNow } =
    useMutateRunNowAutoPostRule();
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);

  const handleRunNow = (rule: typeDataAutoPostRule) => {
    setRunningRuleId(rule.id);
    runNow(rule.id, {
      onSuccess: () => {
        setRunningRuleId(null);
        notifications.show({
          title: "Sukses",
          message: `Aturan "${rule.name}" dijalankan`,
          color: "green",
        });
      },
      onError: (err: unknown) => {
        setRunningRuleId(null);
        const axErr = err as { response?: { data?: { message?: string } } };
        const msg =
          axErr?.response?.data?.message ?? "Gagal menjalankan aturan";
        notifications.show({ title: "Error", message: msg, color: "red" });
      },
    });
  };

  const rules = dataRule?.data?.data ?? [];
  const meta = dataRule?.data?.meta;
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
        <Text fw={600}>Auto Post Rule</Text>
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
          Tambah Aturan
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => {
            const val = e.target.value;
            setInputSearch(val);
            debouncedSearch(val);
          }}
          placeholder="Cari nama aturan..."
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
              <Table.Th>Target</Table.Th>
              <Table.Th>Save Mode</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Dibuat</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              rules.length > 0 &&
              rules.map((rule: typeDataAutoPostRule) => (
                <Table.Tr key={rule.id}>
                  <Table.Td>{rule.name}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {rule.targets.map((t) => (
                        <Badge key={t} variant="light" tt="capitalize">
                          {t}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={rule.save_mode ? "blue" : "gray"}
                      variant="light"
                    >
                      {rule.save_mode ? "Ya" : "Tidak"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={rule.is_active ? "green" : "gray"}
                      variant="light"
                    >
                      {rule.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {rule.created_at
                        ? dayjs(rule.created_at).format("DD MMM YYYY, HH.mm")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Box sx={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <Tooltip label="Jalankan Sekarang">
                        <Button
                          color="blue"
                          size="xs"
                          loading={isRunningNow && runningRuleId === rule.id}
                          onClick={() => handleRunNow(rule)}
                        >
                          Jalankan
                        </Button>
                      </Tooltip>
                      <Button
                        color="blue"
                        size="xs"
                        onClick={() => {
                          setRuleToEdit(rule);
                          setOpenEdit(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        onClick={() => {
                          setRuleToDelete(rule);
                          setModalDeleteOpen(true);
                        }}
                      >
                        Hapus
                      </Button>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && rules.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6} align="center" height={50}>
                  Tidak ada data ditemukan
                </Table.Td>
              </Table.Tr>
            )}
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={6} align="center" height={50}>
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

      <ModalAddAutoPostRule
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={onSuccessAdd}
      />

      <ModalEditAutoPostRule
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setRuleToEdit(null);
        }}
        onSuccess={onSuccessEdit}
        defaultValue={ruleToEdit}
      />

      <ModalDeleteConfirmation
        open={modalDeleteOpen}
        onClose={() => {
          setModalDeleteOpen(false);
          setRuleToDelete(null);
        }}
        onSubmit={handleDeleteRule}
        label="Yakin ingin menghapus auto post rule ini?"
        isDeleting={isPendingDelete}
        isSubmitDisabled={false}
      />
    </Box>
  );
}
