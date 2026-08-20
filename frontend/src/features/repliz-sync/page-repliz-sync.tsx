import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import ModalFormSyncRule from "@/features/repliz-sync/components/modal-form-sync-rule";
import {
  useGetAllSyncRule,
  useGetSyncedPost,
  useMutateDeleteSyncRule,
  useMutateDeleteSyncedPost,
  useMutateRunSyncRule,
} from "@/features/repliz-sync/hooks/useReplizSync";
import type { typeDataReplizSyncRule } from "@/features/repliz-sync/type";
import dayjs from "@/libs/dayjs";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { MdDelete, MdEdit, MdPlayArrow } from "react-icons/md";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

export default function PageReplizSync() {
  const navigate = useNavigate();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<typeDataReplizSyncRule | null>(null);
  const [deleting, setDeleting] = useState<typeDataReplizSyncRule | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [syncedPage, setSyncedPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState<"selected" | "all" | null>(null);
  const [alsoDeleteOnRepliz, setAlsoDeleteOnRepliz] = useState(true);

  const { data: dataRule, isLoading, refetch } = useGetAllSyncRule();
  const {
    data: dataSynced,
    refetch: refetchSynced,
    isError: isSyncedError,
    error: syncedError,
  } = useGetSyncedPost({
    ruleId: selectedRuleId,
    status: statusFilter ?? undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: syncedPage,
    limit: 25,
  });

  const { mutate: deleteRule, isPending: isDeleting } =
    useMutateDeleteSyncRule();
  const { mutate: runRule, isPending: isRunning } = useMutateRunSyncRule();
  const { mutate: deleteSynced, isPending: isDeletingSynced } =
    useMutateDeleteSyncedPost();

  const rules = dataRule?.data ?? [];
  const syncedPosts = dataSynced?.data?.data ?? [];
  const syncedMeta = dataSynced?.data?.meta;
  const syncedErrorMessage =
    (syncedError as { response?: { data?: { message?: string } } })?.response
      ?.data?.message ?? "Gagal memuat konten tersinkron";

  // Mengubah filter apa pun harus mengembalikan ke halaman 1 — kalau tidak,
  // pengguna yang sedang di halaman 3 lalu mempersempit rentang tanggal akan
  // melihat tabel kosong padahal datanya ada di halaman 1.
  const applyFilter = (fn: () => void) => {
    fn();
    setSyncedPage(1);
  };

  const handleRun = (rule: typeDataReplizSyncRule) => {
    runRule(rule.id, {
      onSuccess: (res) => {
        // Proses berjalan di server; pesan ini hanya konfirmasi bahwa
        // permintaannya diterima. Hasil akhirnya muncul di kolom Run
        // Terakhir setelah polling menangkap perubahan status.
        notifications.show({
          title: "Dimulai",
          message: res.message,
          color: "blue",
        });
        refetch();
        refetchSynced();
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Gagal",
          message:
            axErr?.response?.data?.message ?? "Gagal menjalankan sinkronisasi",
          color: "red",
        });
      },
    });
  };

  const handleDeleteSynced = () => {
    if (!deleteMode) return;

    deleteSynced(
      {
        ...(deleteMode === "selected"
          ? { ids: checkedIds }
          : { all: true }),
        alsoDeleteOnRepliz,
      },
      {
        onSuccess: (res) => {
          notifications.show({
            title: res.data.replizError ? "Sebagian gagal" : "Sukses",
            message: res.message,
            color: res.data.replizError ? "yellow" : "green",
          });
          setCheckedIds([]);
          setDeleteMode(null);
          setSyncedPage(1);
          refetchSynced();
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          notifications.show({
            title: "Error",
            message:
              axErr?.response?.data?.message ?? "Gagal menghapus konten",
            color: "red",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteRule(deleting.id, {
      onSuccess: () => {
        notifications.show({
          title: "Sukses",
          message: "Rule dihapus",
          color: "green",
        });
        setDeleting(null);
        refetch();
      },
      onError: () => {
        notifications.show({
          title: "Error",
          message: "Gagal menghapus rule",
          color: "red",
        });
      },
    });
  };

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
        <Text fw={600}>Sinkronisasi Repliz</Text>
      </Group>

      <Alert color="blue" variant="light" mb={16}>
        Sistem memeriksa postingan baru sesuai <b>jam scrape</b> masing-masing
        rule, lalu menjadwalkannya ke akun Repliz mulai jam yang ditentukan
        tiap rule. Sebar jam scrape antar rule agar bebannya tidak menumpuk.
        Konten yang sudah pernah dikirim tidak akan dikirim ulang.
      </Alert>

      <Group mb={12}>
        <Button
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
          color="primary"
          size="sm"
        >
          Tambah Rule
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={900}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Label</Table.Th>
              <Table.Th>Target (z)</Table.Th>
              <Table.Th>Ke Repliz (y)</Table.Th>
              <Table.Th>Jadwal</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Run Terakhir</Table.Th>
              <Table.Th ta="center">Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py={20}>
                    Memuat…
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}

            {!isLoading && rules.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py={20}>
                    Belum ada rule. Tambah rule untuk mulai kloning konten.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}

            {rules.map((rule) => (
              <Table.Tr
                key={rule.id}
                onClick={() => applyFilter(() => setSelectedRuleId(rule.id))}
                style={{ cursor: "pointer" }}
                bg={selectedRuleId === rule.id ? "var(--mantine-color-blue-0)" : undefined}
              >
                <Table.Td>{rule.label}</Table.Td>
                <Table.Td>
                  <Badge
                    size="xs"
                    variant="light"
                    color={
                      rule.sourcePlatform === "facebook"
                        ? "blue"
                        : rule.sourcePlatform === "tiktok"
                          ? "dark"
                          : "pink"
                    }
                    mb={4}
                  >
                    {rule.sourcePlatform ?? "instagram"}
                  </Badge>
                  <Group gap={6} wrap="wrap">
                    {(rule.targetUsernames ?? []).map((username) => (
                      <Anchor
                        key={username}
                        href={
                          rule.sourcePlatform === "facebook"
                            ? `https://www.facebook.com/${username}`
                            : rule.sourcePlatform === "tiktok"
                              ? `https://www.tiktok.com/@${username}`
                              : `https://www.instagram.com/${username}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{username}
                      </Anchor>
                    ))}
                    {(rule.targetUsernames ?? []).length === 0 && (
                      <Text size="sm" c="dimmed">
                        -
                      </Text>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{rule.replizAccountLabel ?? "-"}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {rule.scheduleStartTime} · tiap{" "}
                    {rule.scheduleIntervalMinutes}m
                  </Text>
                  <Text size="xs" c="dimmed">
                    scrape {rule.scrapeTime ?? "05:00"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    maks {rule.maxItems}
                    {rule.sourcePlatform !== "tiktok"
                      ? ` · ${rule.scrapeMode}`
                      : ""}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={rule.status === "active" ? "green" : "gray"}
                    variant="light"
                  >
                    {rule.status === "active" ? "aktif" : "dijeda"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {rule.lastRunStatus === "running" ? (
                    <Group gap={6} wrap="nowrap">
                      <Loader size={14} />
                      <Text size="xs" c="blue">
                        Sedang berjalan…
                      </Text>
                    </Group>
                  ) : rule.lastRunAt ? (
                    <>
                      <Text size="xs">
                        {dayjs(rule.lastRunAt).format("DD MMM YYYY HH:mm")}
                      </Text>
                      <Text
                        size="xs"
                        c={
                          rule.lastRunStatus === "failed" ? "red" : "dimmed"
                        }
                      >
                        {rule.lastRunMessage}
                      </Text>
                    </>
                  ) : (
                    <Text size="xs" c="dimmed">
                      belum pernah
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={6} justify="center" wrap="nowrap">
                    <Tooltip
                      label={
                        rule.lastRunStatus === "running"
                          ? "Sedang berjalan…"
                          : "Jalankan sekarang"
                      }
                    >
                      <ActionIcon
                        variant="light"
                        color="green"
                        // Loading mengikuti status rule, bukan status request:
                        // requestnya selesai seketika (fire-and-forget),
                        // sedangkan prosesnya masih berjalan di server.
                        loading={rule.lastRunStatus === "running" || isRunning}
                        disabled={rule.lastRunStatus === "running"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRun(rule);
                        }}
                      >
                        <MdPlayArrow size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(rule);
                          setOpenForm(true);
                        }}
                      >
                        <MdEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Hapus">
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(rule);
                        }}
                      >
                        <MdDelete size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Box mt={28}>
        <Text fw={600} mb={8}>
          Konten Tersinkron
          {selectedRuleId && (
            <Text span size="sm" c="dimmed" ml={8}>
              (klik baris rule lain untuk memfilter)
            </Text>
          )}
        </Text>

        <Group gap={10} mb={12} align="flex-end" wrap="wrap">
          <TextInput
            label="Dari tanggal"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              const v = e.currentTarget.value;
              applyFilter(() => setDateFrom(v));
            }}
            w={{ base: "100%", sm: 170 }}
          />
          <TextInput
            label="Sampai tanggal"
            type="date"
            value={dateTo}
            onChange={(e) => {
              const v = e.currentTarget.value;
              applyFilter(() => setDateTo(v));
            }}
            w={{ base: "100%", sm: 170 }}
          />
          <Select
            label="Status"
            placeholder="Semua"
            clearable
            data={[
              { value: "scheduled", label: "Terjadwal" },
              { value: "failed", label: "Gagal" },
            ]}
            value={statusFilter}
            onChange={(v) => applyFilter(() => setStatusFilter(v))}
            w={{ base: "100%", sm: 150 }}
          />
          {(dateFrom || dateTo || statusFilter || selectedRuleId) && (
            <Button
              variant="subtle"
              size="sm"
              onClick={() =>
                applyFilter(() => {
                  setDateFrom("");
                  setDateTo("");
                  setStatusFilter(null);
                  setSelectedRuleId(undefined);
                })
              }
            >
              Reset filter
            </Button>
          )}

          <Button
            color="red"
            variant="light"
            size="sm"
            disabled={checkedIds.length === 0}
            onClick={() => setDeleteMode("selected")}
            leftSection={<MdDelete size={16} />}
          >
            Hapus terpilih ({checkedIds.length})
          </Button>
          <Button
            color="red"
            size="sm"
            disabled={(syncedMeta?.total ?? 0) === 0}
            onClick={() => setDeleteMode("all")}
            leftSection={<MdDelete size={16} />}
          >
            Hapus semua
          </Button>
        </Group>
        <Table.ScrollContainer minWidth={800}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    aria-label="Pilih semua di halaman ini"
                    checked={
                      syncedPosts.length > 0 &&
                      syncedPosts.every((p) => checkedIds.includes(p.id))
                    }
                    indeterminate={
                      checkedIds.length > 0 &&
                      !syncedPosts.every((p) => checkedIds.includes(p.id))
                    }
                    onChange={(e) =>
                      setCheckedIds(
                        e.currentTarget.checked
                          ? Array.from(
                              new Set([
                                ...checkedIds,
                                ...syncedPosts.map((p) => p.id),
                              ]),
                            )
                          : checkedIds.filter(
                              (id) => !syncedPosts.some((p) => p.id === id),
                            ),
                      )
                    }
                  />
                </Table.Th>
                <Table.Th>Konten</Table.Th>
                <Table.Th>Target</Table.Th>
                <Table.Th>Caption</Table.Th>
                <Table.Th>Dijadwalkan</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isSyncedError && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="red" py={16}>
                      {syncedErrorMessage}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}

              {!isSyncedError && syncedPosts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py={16}>
                      {dateFrom || dateTo || statusFilter || selectedRuleId
                        ? "Tidak ada konten yang cocok dengan filter"
                        : "Belum ada konten tersinkron"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {syncedPosts.map((post) => (
                <Table.Tr key={post.id}>
                  <Table.Td>
                    <Checkbox
                      aria-label={`Pilih ${post.shortcode}`}
                      checked={checkedIds.includes(post.id)}
                      onChange={(e) =>
                        setCheckedIds(
                          e.currentTarget.checked
                            ? [...checkedIds, post.id]
                            : checkedIds.filter((id) => id !== post.id),
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    {post.postUrl ? (
                      <Anchor
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                      >
                        {post.shortcode}
                      </Anchor>
                    ) : (
                      post.shortcode
                    )}
                    <Text size="xs" c="dimmed">
                      {post.isVideo ? "video" : "image"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {post.targetUsername ? `@${post.targetUsername}` : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" lineClamp={2}>
                      {post.caption || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {post.scheduledAt
                        ? dayjs(post.scheduledAt).format("DD MMM HH:mm")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={post.status === "scheduled" ? "green" : "red"}
                      variant="light"
                    >
                      {post.status}
                    </Badge>
                    {post.errorMessage && (
                      <Text size="xs" c="red" lineClamp={2}>
                        {post.errorMessage}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Box>

      {syncedMeta && syncedMeta.total > 0 && (
        <Group justify="space-between" mt={12} wrap="wrap">
          <Text size="sm" c="dimmed">
            Total {syncedMeta.total} konten
          </Text>
          {syncedMeta.total_page > 1 && (
            <Pagination
              total={syncedMeta.total_page}
              value={syncedPage}
              onChange={setSyncedPage}
              size="sm"
            />
          )}
        </Group>
      )}

      <Modal
        opened={deleteMode !== null}
        onClose={() => setDeleteMode(null)}
        title="Hapus konten tersinkron"
        centered
      >
        <Stack gap={12}>
          <Text size="sm">
            {deleteMode === "all" ? (
              <>
                Menghapus <b>seluruh {syncedMeta?.total ?? 0} catatan</b>{" "}
                konten tersinkron
                {selectedRuleId || dateFrom || dateTo || statusFilter
                  ? " (filter yang aktif TIDAK berpengaruh — semua catatan terhapus)"
                  : ""}
                .
              </>
            ) : (
              <>
                Menghapus <b>{checkedIds.length} catatan</b> terpilih.
              </>
            )}
          </Text>

          <Checkbox
            label="Hapus juga jadwalnya di Repliz"
            description="Kalau tidak dicentang, jadwal tetap terbit di Repliz dan konten yang sama bisa terjadwal ulang pada sinkronisasi berikutnya."
            checked={alsoDeleteOnRepliz}
            onChange={(e) => setAlsoDeleteOnRepliz(e.currentTarget.checked)}
          />

          <Alert color="red" variant="light">
            Tindakan ini permanen dan tidak bisa dibatalkan.
          </Alert>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteMode(null)}>
              Batal
            </Button>
            <Button
              color="red"
              loading={isDeletingSynced}
              onClick={handleDeleteSynced}
            >
              Hapus
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ModalFormSyncRule
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSuccess={() => refetch()}
        rule={editing}
      />

      <ModalDeleteConfirmation
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onSubmit={handleDelete}
        isDeleting={isDeleting}
        isSubmitDisabled={isDeleting}
        label={deleting?.label ?? ""}
      />
    </Box>
  );
}
