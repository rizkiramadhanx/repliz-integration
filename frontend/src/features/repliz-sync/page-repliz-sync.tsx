import ModalDeleteConfirmation from "@/components/moleculs/modal/modal-delete-confirmation";
import ModalFormSyncRule from "@/features/repliz-sync/components/modal-form-sync-rule";
import {
  useGetAllSyncRule,
  useGetSyncedPost,
  useMutateDeleteSyncRule,
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
  Group,
  Table,
  Text,
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

  const { data: dataRule, isLoading, refetch } = useGetAllSyncRule();
  const { data: dataSynced, refetch: refetchSynced } =
    useGetSyncedPost(selectedRuleId);

  const { mutate: deleteRule, isPending: isDeleting } =
    useMutateDeleteSyncRule();
  const { mutate: runRule, isPending: isRunning } = useMutateRunSyncRule();

  const rules = dataRule?.data ?? [];
  const syncedPosts = dataSynced?.data ?? [];

  const handleRun = (rule: typeDataReplizSyncRule) => {
    runRule(rule.id, {
      onSuccess: (res) => {
        notifications.show({
          title: "Selesai",
          message: res.message,
          color: "green",
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
        Setiap hari pukul <b>05:00 WIB</b> sistem memeriksa postingan baru dari
        akun target, lalu menjadwalkannya ke akun Repliz mulai jam yang
        ditentukan tiap rule. Konten yang sudah pernah dikirim tidak akan
        dikirim ulang.
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
                onClick={() => setSelectedRuleId(rule.id)}
                style={{ cursor: "pointer" }}
                bg={selectedRuleId === rule.id ? "var(--mantine-color-blue-0)" : undefined}
              >
                <Table.Td>{rule.label}</Table.Td>
                <Table.Td>
                  <Anchor
                    href={`https://www.instagram.com/${rule.targetUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{rule.targetUsername}
                  </Anchor>
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
                    maks {rule.maxItems} · {rule.scrapeMode}
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
                  {rule.lastRunAt ? (
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
                    <Tooltip label="Jalankan sekarang">
                      <ActionIcon
                        variant="light"
                        color="green"
                        loading={isRunning}
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
        <Table.ScrollContainer minWidth={800}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Konten</Table.Th>
                <Table.Th>Caption</Table.Th>
                <Table.Th>Dijadwalkan</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {syncedPosts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" c="dimmed" py={16}>
                      Belum ada konten tersinkron
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {syncedPosts.map((post) => (
                <Table.Tr key={post.id}>
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
