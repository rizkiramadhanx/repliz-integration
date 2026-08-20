import useGetAllReplizAccount from "@/features/repliz/hooks/useGetAllReplizAccount";
import useMutateImportUrls, {
  type typeImportUrlResult,
} from "@/features/url-import/hooks/useMutateImportUrls";
import dayjs from "@/libs/dayjs";
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Code,
  Group,
  List,
  NumberInput,
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
const MAX_URLS = 100;

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
  const [results, setResults] = useState<typeImportUrlResult[]>([]);

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
      },
      {
        onSuccess: (res) => {
          setResults(res.data.results);
          const dup = res.data.results.filter((r) => r.duplicate).length;
          if (dup > 0) {
            notifications.show({
              title: "Ada URL duplikat",
              message: `${dup} URL pernah diimpor ke akun ini sebelumnya dan tetap dijadwalkan ulang.`,
              color: "orange",
            });
          }
          notifications.show({
            title: res.data.success === res.data.total ? "Sukses" : "Sebagian gagal",
            message: res.message,
            color: res.data.success === res.data.total ? "green" : "yellow",
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
          impor. Tiap URL perlu mengunduh media dan memanggil Repliz, jadi
          batch yang terlalu besar membuat prosesnya sangat lama. Bagi menjadi
          beberapa batch.
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
        {results.length > 0 && (
          <Button variant="subtle" onClick={() => setResults([])}>
            Bersihkan hasil
          </Button>
        )}
      </Group>

      {results.length > 0 && (
        <Box mt={24}>
          <Text fw={600} mb={8}>
            Hasil
          </Text>
          <Table.ScrollContainer minWidth={720}>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>URL</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Dijadwalkan</Table.Th>
                  <Table.Th>Caption</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((result) => (
                  <Table.Tr key={result.url}>
                    <Table.Td>
                      <Text size="xs" lineClamp={1}>
                        {result.url}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="wrap">
                        <Badge
                          color={result.ok ? "green" : "red"}
                          variant="light"
                        >
                          {result.ok ? "terjadwal" : "gagal"}
                        </Badge>
                        {result.duplicate && (
                          <Badge color="orange" variant="light">
                            duplikat
                          </Badge>
                        )}
                      </Group>
                      {result.duplicate && result.previousScheduledAt && (
                        <Text size="xs" c="orange">
                          Pernah diimpor{" "}
                          {dayjs(result.previousScheduledAt).format(
                            "DD MMM HH:mm",
                          )}
                        </Text>
                      )}
                      {result.error && (
                        <Text size="xs" c="red" lineClamp={2}>
                          {result.error}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        {result.scheduledAt
                          ? dayjs(result.scheduledAt).format("DD MMM HH:mm")
                          : "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" lineClamp={2}>
                        {result.caption || "-"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Box>
      )}
    </Box>
  );
}
