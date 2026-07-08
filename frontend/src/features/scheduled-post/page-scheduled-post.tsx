import PaginationTotal from "@/components/moleculs/PaginationTotal";
import dayjs from "@/libs/dayjs";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  Pagination,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";
import BlastJobsSection from "./components/blast-jobs-section";
import ModalAddDraft from "./components/modal-add-draft";
import ModalEditDraft from "./components/modal-edit-draft";
import ModalScrapeBatch from "./components/modal-scrape-batch";
import useGetAllScheduledPosts from "./hooks/useGetAllScheduledPosts";
import useMutatePublishNow from "./hooks/useMutatePublishNow";
import useMutateBulkPublishNow from "./hooks/useMutateBulkPublishNow";
import useMutateCancelSchedule from "./hooks/useMutateCancelSchedule";
import useMutateDeletePost from "./hooks/useMutateDeletePost";
import useMutateBulkDelete from "./hooks/useMutateBulkDelete";
import type { typeDataScheduledPost, typeScheduledPostStatus } from "./type";

const STATUS_COLOR: Record<typeScheduledPostStatus, string> = {
  draft: "gray",
  scheduled: "blue",
  publishing: "yellow",
  success: "green",
  failed: "red",
  cancelled: "gray",
};

const STATUS_LABEL: Record<typeScheduledPostStatus, string> = {
  draft: "Draft",
  scheduled: "Terjadwal",
  publishing: "Memposting",
  success: "Berhasil",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

function defaultDateRange(): [string, string] {
  const today = dayjs().startOf("day");
  const inSevenDays = dayjs().add(7, "day").endOf("day");
  return [today.toISOString(), inSevenDays.toISOString()];
}

export default function PageScheduledPost() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] =
    useState<[string | null, string | null]>(defaultDateRange());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeDataScheduledPost | null>(null);

  const { data, isLoading, isSuccess, refetch } = useGetAllScheduledPosts({
    page,
    limit: 25,
    startDate: dateRange[0] ?? undefined,
    endDate: dateRange[1] ?? undefined,
  });

  const posts = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const { mutate: publishNow, isPending: isPublishing } = useMutatePublishNow();
  const { mutate: bulkPublishNow } = useMutateBulkPublishNow();
  const { mutate: cancelSchedule } = useMutateCancelSchedule();
  const { mutate: deletePost } = useMutateDeletePost();
  const { mutate: bulkDelete } = useMutateBulkDelete();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === posts.length ? [] : posts.map((p) => p.id)));
  };

  const handlePublishNow = (id: string) => {
    publishNow(id, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Post sedang diproses", color: "green" });
        refetch();
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Error",
          message: axErr?.response?.data?.message ?? "Gagal publish",
          color: "red",
        });
      },
    });
  };

  const handleBulkPublishNow = () => {
    bulkPublishNow(selectedIds, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Bulk publish diproses", color: "green" });
        setSelectedIds([]);
        refetch();
      },
    });
  };

  const handleCancel = (id: string) => {
    cancelSchedule(id, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Jadwal dibatalkan", color: "green" });
        refetch();
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Error",
          message: axErr?.response?.data?.message ?? "Gagal membatalkan jadwal",
          color: "red",
        });
      },
    });
  };

  const handleDelete = (id: string) => {
    deletePost(id, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Post dihapus", color: "green" });
        refetch();
      },
    });
  };

  const handleBulkDelete = () => {
    bulkDelete(selectedIds, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Bulk delete diproses", color: "green" });
        setSelectedIds([]);
        refetch();
      },
    });
  };

  return (
    <Box px={20} py={10}>
      <Group mb="md" justify="space-between">
        <Group>
          <Button variant="filled" color="primary" size="xs" onClick={() => navigate(-1)}>
            <TiArrowBack />
          </Button>
          <Text fw={600}>Penjadwalan Posting</Text>
        </Group>
      </Group>

      <Flex justify="space-between" wrap="wrap" gap={10} mb={10}>
        <DatePickerInput
          type="range"
          placeholder="Filter jadwal (pilih tanggal atau rentang)"
          value={dateRange}
          onChange={setDateRange}
          clearable
          allowSingleDateInRange
          w={280}
        />
        <Group>
          {selectedIds.length > 0 && (
            <>
              <Button size="xs" color="teal" variant="light" onClick={handleBulkPublishNow}>
                Posting Sekarang ({selectedIds.length})
              </Button>
              <Button size="xs" color="red" variant="light" onClick={handleBulkDelete}>
                Hapus Terpilih ({selectedIds.length})
              </Button>
            </>
          )}
          <Button size="xs" variant="light" onClick={() => setAddModalOpen(true)}>
            Tambah Draft Manual
          </Button>
          <Button size="xs" variant="light" onClick={() => setScrapeModalOpen(true)}>
            Scrape dari Profil
          </Button>
        </Group>
      </Flex>

      <Table.ScrollContainer minWidth={900} maxHeight="calc(100vh - 300px)">
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>
                <Checkbox
                  checked={posts.length > 0 && selectedIds.length === posts.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < posts.length}
                  onChange={toggleSelectAll}
                />
              </Table.Th>
              <Table.Th>Jadwal</Table.Th>
              <Table.Th>Sumber</Table.Th>
              <Table.Th>Caption</Table.Th>
              <Table.Th>Target</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              posts.length > 0 &&
              posts.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Checkbox checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {p.scheduled_at ? dayjs(p.scheduled_at).format("DD MMM YYYY, HH.mm") : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td maw={160}>
                    {p.source_url ? (
                      <a href={p.source_url} target="_blank" rel="noreferrer">
                        <Text size="sm" truncate="end">
                          Instagram
                        </Text>
                      </a>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Upload manual
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td maw={220}>
                    <Tooltip label={p.caption} multiline maw={320}>
                      <Text size="sm" lineClamp={1}>
                        {p.caption || "-"}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td maw={160}>
                    <Text size="sm" truncate="end">
                      {p.target_account_ids.length === 0
                        ? "-"
                        : `${p.target_account_ids.length} akun`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {p.status === "failed" ? (
                      <Tooltip label={p.error_message ?? "Unknown error"}>
                        <Badge color={STATUS_COLOR[p.status]} variant="light" size="sm">
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge color={STATUS_COLOR[p.status]} variant="light" size="sm">
                        {STATUS_LABEL[p.status]}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {(p.status === "draft" || p.status === "scheduled") && (
                        <Button
                          size="xs"
                          color="teal"
                          loading={isPublishing}
                          onClick={() => handlePublishNow(p.id)}
                        >
                          Posting
                        </Button>
                      )}
                      {(p.status === "draft" || p.status === "scheduled") && (
                        <Button size="xs" color="blue" onClick={() => setEditing(p)}>
                          Edit
                        </Button>
                      )}
                      {p.status === "scheduled" && (
                        <Button size="xs" color="orange" variant="light" onClick={() => handleCancel(p.id)}>
                          Batalkan
                        </Button>
                      )}
                      <Button size="xs" color="red" onClick={() => handleDelete(p.id)}>
                        Hapus
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && posts.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7} align="center" height={50}>
                  Tidak ada data ditemukan
                </Table.Td>
              </Table.Tr>
            )}
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={7} align="center" height={50}>
                  Loading...
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Flex mt={10} justify="space-between" align="center" px={20} wrap="wrap" gap="sm">
        <PaginationTotal total={meta?.total ?? 0} page={page} limit={25} />
        {isSuccess && (meta?.total_page ?? 0) > 0 && (
          <Pagination color="primary" value={page} total={meta?.total_page ?? 0} onChange={setPage} />
        )}
      </Flex>

      <BlastJobsSection />

      <ModalAddDraft
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(post) => {
          refetch();
          setEditing(post);
        }}
      />
      <ModalEditDraft
        open={!!editing}
        onClose={() => setEditing(null)}
        onSuccess={() => refetch()}
        defaultValue={editing}
      />
      <ModalScrapeBatch
        open={scrapeModalOpen}
        onClose={() => setScrapeModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </Box>
  );
}
