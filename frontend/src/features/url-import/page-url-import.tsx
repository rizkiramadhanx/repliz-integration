import useGetAllReplizAccount from "@/features/repliz/hooks/useGetAllReplizAccount";
import useMutateImportUrls, {
  useGetImportJob,
  useGetImportHistory,
  useMutateRetryImportJob,
  useGetMediaCleanupPreview,
  useMutateMediaCleanup,
  useMutateCancelImportJob,
} from "@/features/url-import/hooks/useMutateImportUrls";
import dayjs from "@/libs/dayjs";
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Code,
  Group,
  List,
  NumberInput,
  Loader,
  Pagination,
  Progress,
  Select,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

// Label akun memakai `name`, bukan `username`: untuk Page Facebook, Repliz
// mengisi username dengan KATEGORI Page ("Recruiter", "Art Gallery") sehingga
// sulit dibedakan.
function accountLabel(account: {
  name?: string;
  username?: string;
  type?: string;
}): string {
  const displayName = account.name?.trim() || `@${account.username ?? ""}`;
  return `${displayName} (${account.type ?? "-"})`;
}

// Selaras dengan MAX_URLS_PER_IMPORT di backend; ditegakkan di kedua sisi
// supaya pengguna diperingatkan sebelum menunggu lama, bukan setelahnya.
const MAX_URLS = 2000;

export default function PageUrlImport() {
  const navigate = useNavigate();

  const [urls, setUrls] = useState("");
  const [replizAccountId, setReplizAccountId] = useState<string | null>(null);
  // Default hari ini dalam waktu lokal — toISOString() memakai UTC dan bisa
  // meleset satu hari bagi pengguna di zona waktu timur.
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  });
  const [startTime, setStartTime] = useState("06:00");
  const [intervalMinutes, setIntervalMinutes] = useState<number | string>(60);
  // Dikelola sebagai "belum disentuh pengguna" (null) supaya bisa mengikuti
  // platform akun tujuan secara otomatis; begitu pengguna mengubahnya,
  // pilihannya dihormati dan tidak ditimpa lagi.
  const [autoAddMusic, setAutoAddMusic] = useState<boolean | null>(null);
  const [postType, setPostType] = useState<"video" | "reel" | "story">("video");

  // Penyaring riwayat, mengikuti pola Konten Tersinkron.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<string | undefined>();
  const [historyPage, setHistoryPage] = useState(1);

  const { data: dataReplizAccount } = useGetAllReplizAccount({
    page: 1,
    limit: 50,
  });
  const replizAccounts = dataReplizAccount?.data?.data?.docs ?? [];
  const selectedAccount = replizAccounts.find(
    (account) => account.id === replizAccountId,
  );

  // TikTok menekan jangkauan video tanpa trek musik terdaftar, jadi opsi ini
  // dinyalakan secara bawaan untuk akun TikTok. Platform lain tidak, karena
  // di sana musik tambahan justru menimpa audio asli konten.
  const isTiktokTarget = selectedAccount?.type === "tiktok";
  const effectiveAutoAddMusic = autoAddMusic ?? isTiktokTarget;

  const { mutate: importUrls, isPending } = useMutateImportUrls();
  const { mutate: retryJob, isPending: isRetrying } = useMutateRetryImportJob();
  const { data: dataCleanup, refetch: refetchCleanup } =
    useGetMediaCleanupPreview();
  const { mutate: cleanupMedia, isPending: isCleaning } =
    useMutateMediaCleanup();
  const { mutate: cancelJob, isPending: isCanceling } =
    useMutateCancelImportJob();
  const cleanup = dataCleanup?.data;
  const { data: dataJob, refetch: refetchJob } = useGetImportJob(1, 5);
  const jobs = dataJob?.data?.data ?? [];
  const runningJob = jobs.find((job) => job.status === "running");

  const { data: dataHistory, refetch: refetchHistory } = useGetImportHistory({
    jobId: jobFilter,
    status: statusFilter ?? undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: historyPage,
    limit: 25,
  });
  const historyRows = dataHistory?.data?.data ?? [];
  const historyMeta = dataHistory?.data?.meta;

  const applyFilter = (change: () => void) => {
    change();
    setHistoryPage(1);
  };

  const urlCount = urls
    .split(/[\r\n,\s]+/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url)).length;

  const handleSubmit = () => {
    if (!replizAccountId) {
      notifications.show({
        title: "Lengkapi form",
        message: "Pilih akun Repliz tujuan",
        color: "yellow",
      });
      return;
    }
    if (urlCount === 0) {
      notifications.show({
        title: "Lengkapi form",
        message: "Tempel minimal satu URL",
        color: "yellow",
      });
      return;
    }

    importUrls(
      {
        urls,
        replizAccountId,
        startDate,
        startTime,
        intervalMinutes: Number(intervalMinutes) || 60,
        autoAddMusic: effectiveAutoAddMusic,
        postType,
        // Jam yang diketik pengguna adalah jam DI TEMPATNYA. Tanpa offset ini
        // server menafsirkannya sebagai waktu lokalnya sendiri, sehingga
        // jadwal meleset sebesar selisih zona waktu (WIB vs UTC = 7 jam).
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      },
      {
        onSuccess: (res) => {
          // Impor berjalan di latar belakang: kemajuannya dipantau lewat
          // daftar job, bukan dari response ini.
          setUrls("");
          void refetchJob();
          void refetchHistory();
          notifications.show({
            title: "Impor dimulai",
            message: res.message,
            color: "blue",
          });
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          notifications.show({
            title: "Gagal",
            message: axErr?.response?.data?.message ?? "Gagal mengimpor URL",
            color: "red",
          });
        },
      },
    );
  };

  // URL yang sudah terjadwal tetap ada di Repliz — yang dibatalkan hanya
  // sisa URL yang belum diproses. Ditegaskan di konfirmasi supaya tidak
  // dikira membatalkan seluruh impor.
  const handleCancelJob = () => {
    if (!runningJob) return;
    const remaining = runningJob.total - runningJob.processed;
    const confirmed = window.confirm(
      `Hentikan impor yang sedang berjalan?\n\n` +
        `${runningJob.processed} dari ${runningJob.total} URL sudah diproses ` +
        `(${runningJob.success} berhasil, ${runningJob.failed} gagal).\n` +
        `${remaining} URL sisanya tidak akan diproses.\n\n` +
        `Jadwal yang SUDAH dibuat tetap ada di Repliz.`,
    );
    if (!confirmed) return;

    cancelJob(runningJob.id, {
      onSuccess: (res) => {
        void refetchJob();
        notifications.show({
          title: "Menghentikan impor",
          message: res.message,
          color: "orange",
        });
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Gagal",
          message:
            axErr?.response?.data?.message ?? "Gagal menghentikan job impor",
          color: "red",
        });
      },
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // Penghapusan berkas tidak bisa dibatalkan, jadi jumlahnya dikonfirmasi
  // lebih dulu. Jadwal di Repliz tidak ikut terhapus — hanya berkas di server.
  const handleCleanup = () => {
    if (!cleanup || cleanup.staleFiles === 0) return;
    const confirmed = window.confirm(
      `Hapus ${cleanup.staleFiles} berkas media (${formatBytes(
        cleanup.staleBytes,
      )}) dari disk server?\n\n` +
        `${cleanup.keptInUse} berkas yang masih dipakai jadwal mendatang tetap disimpan.\n` +
        `Jadwal di Repliz TIDAK ikut terhapus.\n\nTindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    cleanupMedia(undefined, {
      onSuccess: (res) => {
        void refetchCleanup();
        notifications.show({
          title: "Pembersihan selesai",
          message: res.message,
          color: "green",
        });
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Gagal",
          message:
            axErr?.response?.data?.message ?? "Gagal membersihkan media server",
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
        <Text fw={600}>Impor URL ke Repliz</Text>
      </Group>

      <Alert color="blue" variant="light" mb={16}>
        <Text size="sm" mb={6}>
          Tempel daftar URL konten (satu per baris), lalu jadwalkan ke akun
          Repliz. Dipakai untuk <b>TikTok</b> yang daftar profilnya diblokir
          CAPTCHA — Instagram dan Facebook bisa otomatis lewat menu{" "}
          <b>Sinkronisasi Repliz</b>.
        </Text>
        <Text size="sm" fw={600} mt={8}>
          Cara mengambil URL dengan cepat:
        </Text>
        <List size="sm" spacing={2} mt={4}>
          <List.Item>
            Pasang extension dari folder <Code>browser-extension/</Code> lewat{" "}
            <Code>chrome://extensions</Code> → Load unpacked
          </List.Item>
          <List.Item>Buka profil target, scroll secukupnya</List.Item>
          <List.Item>Klik ikon extension → Ambil URL → Salin</List.Item>
        </List>
      </Alert>

      {cleanup && (
        <Alert
          color={cleanup.staleFiles > 0 ? "orange" : "gray"}
          variant="light"
          mb={16}
          title="Penyimpanan media di server"
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Box>
              <Text size="sm">
                Total <b>{cleanup.totalFiles} berkas</b> (
                {formatBytes(cleanup.totalBytes)}) tersimpan di disk server.
              </Text>
              <Text size="sm" c="dimmed">
                {cleanup.staleFiles > 0 ? (
                  <>
                    <b>{cleanup.staleFiles} berkas</b> (
                    {formatBytes(cleanup.staleBytes)}) sudah lewat masa pakai
                    dan bisa dihapus. {cleanup.keptInUse} berkas lain masih
                    dipakai jadwal mendatang — tidak akan disentuh.
                  </>
                ) : (
                  <>
                    Tidak ada berkas yang perlu dibersihkan. Semua{" "}
                    {cleanup.keptInUse} berkas masih dipakai jadwal mendatang.
                  </>
                )}
              </Text>
            </Box>
            <Button
              color="red"
              variant="light"
              onClick={handleCleanup}
              loading={isCleaning}
              disabled={cleanup.staleFiles === 0}
              style={{ flexShrink: 0 }}
            >
              Hapus media lewat masa
            </Button>
          </Group>
        </Alert>
      )}

      <Textarea
        label={`URL konten (${urlCount} terdeteksi)`}
        placeholder={
          "https://www.tiktok.com/@user/video/123...\nhttps://www.tiktok.com/@user/video/456..."
        }
        description="Satu URL per baris. TikTok, Instagram, dan Facebook didukung."
        value={urls}
        onChange={(e) => setUrls(e.currentTarget.value)}
        autosize
        minRows={6}
        maxRows={14}
      />

      {urlCount > MAX_URLS && (
        <Alert color="orange" variant="light" mt={12}>
          Terdeteksi <b>{urlCount} URL</b>, melebihi batas {MAX_URLS} per sekali
          impor. Tiap URL mengunduh media ke server, jadi batch yang terlalu
          besar berisiko memenuhi penyimpanan. Bagi menjadi beberapa batch.
        </Alert>
      )}

      <Group grow mt={12} align="flex-start">
        <Select
          label="Posting ke akun Repliz"
          placeholder="Pilih akun"
          data={replizAccounts.map((account) => ({
            value: account.id,
            label: accountLabel(account),
          }))}
          value={replizAccountId}
          onChange={setReplizAccountId}
          searchable
          required
        />
        <Select
          label="Tipe posting"
          placeholder="Pilih tipe"
          data={[
            { value: "video", label: "Feed (Video)" },
            { value: "reel", label: "Reels" },
            { value: "story", label: "Story (Instagram)" },
          ]}
          value={postType}
          onChange={(val) => setPostType(val as "video" | "reel" | "story")}
          description="Khusus Instagram: pilih Story untuk posting ke Stories"
        />
        <TextInput
          label="Tanggal mulai"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.currentTarget.value)}
        />
        <TextInput
          label="Jam mulai"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.currentTarget.value)}
        />
        <NumberInput
          label="Jeda antar konten (menit)"
          min={1}
          value={intervalMinutes}
          onChange={setIntervalMinutes}
        />
      </Group>

      <Checkbox
        mt={14}
        label="Tambahkan musik otomatis (khusus video)"
        description={
          isTiktokTarget
            ? "Aktif otomatis karena akun tujuan TikTok — video tanpa trek musik terdaftar cenderung ditekan jangkauannya."
            : "Repliz akan memilihkan musik. Umumnya hanya diperlukan untuk akun TikTok."
        }
        checked={effectiveAutoAddMusic}
        onChange={(e) => setAutoAddMusic(e.currentTarget.checked)}
      />

      <Group mt={16}>
        <Button
          onClick={handleSubmit}
          loading={isPending}
          disabled={urlCount === 0 || urlCount > MAX_URLS || !replizAccountId}
          color="primary"
        >
          Jadwalkan {urlCount > 0 ? `${urlCount} konten` : ""}
        </Button>
      </Group>

      {runningJob && (
        <Alert color="blue" variant="light" mt={20}>
          <Group justify="space-between" wrap="wrap" gap={8}>
            <Box>
              <Text size="sm" fw={600}>
                Sedang memproses {runningJob.processed} dari {runningJob.total}{" "}
                URL
              </Text>
              <Text size="xs" c="dimmed">
                {runningJob.replizAccountName ?? "-"} — berhasil{" "}
                {runningJob.success}, gagal {runningJob.failed}
              </Text>
            </Box>
            <Group gap={8} wrap="nowrap">
              <Loader size="sm" />
              <Button
                color="red"
                variant="light"
                size="xs"
                onClick={handleCancelJob}
                loading={isCanceling}
              >
                Hentikan
              </Button>
            </Group>
          </Group>
          <Progress
            mt={10}
            value={
              runningJob.total > 0
                ? (runningJob.processed / runningJob.total) * 100
                : 0
            }
            animated
          />
          <Text size="xs" c="dimmed" mt={6}>
            Halaman boleh ditutup — proses berjalan di server.
          </Text>
        </Alert>
      )}

      {jobs.length > 0 && (
        <Box mt={24}>
          <Text fw={600} mb={8}>
            Batch Impor Terakhir
          </Text>
          <Table.ScrollContainer minWidth={680}>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Waktu</Table.Th>
                  <Table.Th>Akun</Table.Th>
                  <Table.Th>Kemajuan</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Aksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {jobs.map((job) => (
                  <Table.Tr key={job.id}>
                    <Table.Td>
                      <Text size="xs">
                        {dayjs(job.createdAt).format("DD MMM HH:mm")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{job.replizAccountName ?? "-"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        {job.processed}/{job.total}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {job.success} berhasil, {job.failed} gagal
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={
                          job.status === "done"
                            ? job.failed > 0
                              ? "yellow"
                              : "green"
                            : job.status === "running"
                              ? "blue"
                              : "red"
                        }
                      >
                        {job.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          onClick={() =>
                            applyFilter(() =>
                              setJobFilter(
                                jobFilter === job.id ? undefined : job.id,
                              ),
                            )
                          }
                        >
                          {jobFilter === job.id ? "Semua" : "Lihat"}
                        </Button>
                        {job.status !== "running" &&
                          (job.failed > 0 || job.processed < job.total) && (
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="orange"
                            loading={isRetrying}
                            onClick={() =>
                              retryJob(job.id, {
                                onSuccess: (res) => {
                                  void refetchJob();
                                  notifications.show({
                                    title: "Mengulang",
                                    message: res.message,
                                    color: "blue",
                                  });
                                },
                                onError: (err: unknown) => {
                                  const axErr = err as {
                                    response?: { data?: { message?: string } };
                                  };
                                  notifications.show({
                                    title: "Gagal",
                                    message:
                                      axErr?.response?.data?.message ??
                                      "Gagal mengulang",
                                    color: "red",
                                  });
                                },
                              })
                            }
                          >
                            Ulangi ({job.total - job.success})
                            </Button>
                          )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Box>
      )}

      <Box mt={28}>
        <Text fw={600} mb={8}>
          Riwayat Impor URL
          {jobFilter && (
            <Text span size="sm" c="dimmed" ml={8}>
              (disaring pada satu batch)
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
          {(dateFrom || dateTo || statusFilter || jobFilter) && (
            <Button
              variant="subtle"
              size="sm"
              onClick={() =>
                applyFilter(() => {
                  setDateFrom("");
                  setDateTo("");
                  setStatusFilter(null);
                  setJobFilter(undefined);
                })
              }
            >
              Reset filter
            </Button>
          )}
        </Group>

        <Table.ScrollContainer minWidth={780}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>URL</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Konten</Table.Th>
                <Table.Th>Dijadwalkan</Table.Th>
                <Table.Th>Caption</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {historyRows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" c="dimmed" ta="center" py={12}>
                      Belum ada riwayat impor.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {historyRows.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Text size="xs" lineClamp={1}>
                      {row.url}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={row.status === "scheduled" ? "green" : "red"}
                    >
                      {row.status === "scheduled" ? "terjadwal" : "gagal"}
                    </Badge>
                    {row.errorMessage && (
                      <Text size="xs" c="red" lineClamp={2}>
                        {row.errorMessage}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {row.postType ?? "-"}
                      {row.mediaCount > 1 ? ` · ${row.mediaCount} media` : ""}
                    </Text>
                    {row.mediaUrls && row.mediaUrls.length > 0 ? (
                      <Group gap={4} mt={2} wrap="wrap">
                        {row.mediaUrls.map((mediaUrl, index) => (
                          <Anchor
                            key={mediaUrl}
                            href={mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            size="xs"
                          >
                            {row.postType === "image" ||
                            row.postType === "album"
                              ? `foto ${index + 1}`
                              : `video ${index + 1}`}
                          </Anchor>
                        ))}
                      </Group>
                    ) : (
                      row.status === "scheduled" && (
                        // Baris lama diimpor sebelum tautan media disimpan;
                        // tidak bisa diisi ulang karena media aslinya sudah
                        // lama diunduh.
                        <Text size="xs" c="dimmed">
                          (tautan tidak tersimpan)
                        </Text>
                      )
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {row.scheduledAt
                        ? dayjs(row.scheduledAt).format("DD MMM HH:mm")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" lineClamp={2}>
                      {row.caption || "-"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {historyMeta && historyMeta.total_page > 1 && (
          <Group justify="center" mt={12}>
            <Pagination
              value={historyPage}
              onChange={setHistoryPage}
              total={historyMeta.total_page}
              size="sm"
            />
          </Group>
        )}
      </Box>

    </Box>
  );
}
