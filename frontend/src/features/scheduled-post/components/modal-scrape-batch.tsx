import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMemo, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import useMutateStartScrapeBatch from "../hooks/useMutateStartScrapeBatch";
import useMutateStopScrapeBatch from "../hooks/useMutateStopScrapeBatch";
import useScrapeProgressSocket from "../hooks/useScrapeProgressSocket";
import useGetScrapedPosts from "../hooks/useGetScrapedPosts";
import useGetScrapeBatchDetail from "../hooks/useGetScrapeBatchDetail";
import ScrapeResultGrid from "./scrape-result-grid";
import ModalGenerateDrafts from "./modal-generate-drafts";
import type { typeDataScrapedPost } from "../type";

export default function ModalScrapeBatch({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState("");
  const [totalLimit, setTotalLimit] = useState<number | "">(10);
  const [error, setError] = useState("");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const instagramAccounts: typeDataAccount[] = (accountData?.data?.data ?? []).filter(
    (a) => a.type === "instagram",
  );

  const { mutate: startBatch, isPending: isStarting } = useMutateStartScrapeBatch();
  const { mutate: stopBatch } = useMutateStopScrapeBatch();
  const { posts: socketPosts, progress: socketProgress } = useScrapeProgressSocket(batchJobId);

  // Fallback REST — kalau event WebSocket telat/tidak sampai (mis. scrape
  // sudah selesai sebelum socket sempat connect & join room), data tetap
  // muncul lewat polling biasa selama batch masih berjalan.
  const { data: batchDetailData } = useGetScrapeBatchDetail(batchJobId, {
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "running" || !status ? 2000 : false;
    },
  });
  const { data: scrapedPostsData } = useGetScrapedPosts(batchJobId);

  const progress = socketProgress ?? {
    batchJobId: batchJobId ?? "",
    fetchedCount: batchDetailData?.data?.fetched_count ?? 0,
    totalLimit: batchDetailData?.data?.total_limit ?? (totalLimit || 0),
    status: batchDetailData?.data?.status ?? "running",
    errorMessage: batchDetailData?.data?.error_message ?? undefined,
  };

  const posts = useMemo(() => {
    const merged = new Map<string, typeDataScrapedPost>();
    (scrapedPostsData?.data?.data ?? []).forEach((p) => merged.set(p.id, p));
    socketPosts.forEach((p) => merged.set(p.id, p));
    return Array.from(merged.values());
  }, [scrapedPostsData, socketPosts]);

  const isRunning = progress.status === "running";

  const handleClose = () => {
    setSourceAccountId(null);
    setTargetUsername("");
    setTotalLimit(10);
    setError("");
    setBatchJobId(null);
    setSelectedIds([]);
    onClose();
  };

  const handleStart = () => {
    setError("");
    if (!sourceAccountId) {
      setError("Pilih akun browsing terlebih dahulu");
      return;
    }
    if (!targetUsername.trim()) {
      setError("Isi username atau link profil target");
      return;
    }
    if (!totalLimit || totalLimit < 1) {
      setError("Total post harus lebih dari 0");
      return;
    }
    startBatch(
      { sourceAccountId, targetUsername, totalLimit },
      {
        onSuccess: (res) => {
          setBatchJobId(res.data.id);
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          setError(axErr?.response?.data?.message ?? "Gagal memulai scrape");
        },
      },
    );
  };

  const handleStop = () => {
    if (!batchJobId) return;
    stopBatch(batchJobId, {
      onSuccess: () => {
        notifications.show({ title: "Sukses", message: "Scrape dihentikan", color: "green" });
      },
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectablePosts = posts.filter((p) => p.status !== "used");
  const allSelected =
    selectablePosts.length > 0 && selectablePosts.every((p) => selectedIds.includes(p.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === selectablePosts.length ? [] : selectablePosts.map((p) => p.id),
    );
  };

  const progressPercent =
    progress.totalLimit > 0
      ? Math.round((progress.fetchedCount / progress.totalLimit) * 100)
      : 0;

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Scrape dari Profil Instagram"
      size="xl"
      centered
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="md">
        {!batchJobId ? (
          <Group align="flex-end">
            <Select
              label="Akun Browsing (Instagram)"
              placeholder="Pilih akun"
              data={instagramAccounts.map((a) => ({ value: a.id, label: a.label }))}
              value={sourceAccountId}
              onChange={setSourceAccountId}
              style={{ flex: 1 }}
            />
            <TextInput
              label="Username / Link Profil Target"
              placeholder="username atau https://instagram.com/username"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <NumberInput
              label="Total Post"
              min={1}
              step={10}
              value={totalLimit}
              onChange={(v) => setTotalLimit(typeof v === "number" ? v : "")}
              w={120}
            />
            <Button loading={isStarting} onClick={handleStart}>
              Mulai Scrape
            </Button>
          </Group>
        ) : (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm">
                Scraping @{targetUsername} — {progress.fetchedCount}/
                {progress.totalLimit} post ({progress.status})
              </Text>
              {isRunning && (
                <Button size="xs" color="orange" variant="light" onClick={handleStop}>
                  Stop
                </Button>
              )}
            </Group>
            <Progress value={progressPercent} animated={isRunning} />
          </Stack>
        )}

        {(error || progress?.errorMessage) && (
          <Text c="red" size="sm">
            {error || progress?.errorMessage}
          </Text>
        )}

        {posts.length > 0 && (
          <Stack gap="xs">
            <Checkbox
              label={`Hasil Scrape (${posts.length})`}
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleSelectAll}
              disabled={selectablePosts.length === 0}
            />
            <ScrapeResultGrid posts={posts} selectedIds={selectedIds} onToggle={toggleSelect} />
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => setGenerateModalOpen(true)}
              fullWidth
            >
              Generate Draft dari Terpilih ({selectedIds.length})
            </Button>
          </Stack>
        )}
      </Stack>

      <ModalGenerateDrafts
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        onSuccess={() => {
          setSelectedIds([]);
          onSuccess();
        }}
        batchJobId={batchJobId}
        scrapedPostIds={selectedIds}
      />
    </Modal>
  );
}
