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
  Code,
  Group,
  List,
  NumberInput,
  Select,
  Table,
  Text,
  Textarea,
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

export default function PageUrlImport() {
  const navigate = useNavigate();

  const [urls, setUrls] = useState("");
  const [replizAccountId, setReplizAccountId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("06:00");
  const [intervalMinutes, setIntervalMinutes] = useState<number | string>(60);
  const [results, setResults] = useState<typeImportUrlResult[]>([]);

  const { data: dataReplizAccount } = useGetAllReplizAccount({
    page: 1,
    limit: 50,
  });
  const replizAccounts = dataReplizAccount?.data?.data?.docs ?? [];

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
        startTime,
        intervalMinutes: Number(intervalMinutes) || 60,
      },
      {
        onSuccess: (res) => {
          setResults(res.data.results);
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
        <Textarea
          label="Mulai posting"
          description="Format HH:mm"
          value={startTime}
          onChange={(e) => setStartTime(e.currentTarget.value)}
          autosize
          minRows={1}
          maxRows={1}
        />
        <NumberInput
          label="Jeda antar konten (menit)"
          min={1}
          value={intervalMinutes}
          onChange={setIntervalMinutes}
        />
      </Group>

      <Group mt={16}>
        <Button
          onClick={handleSubmit}
          loading={isPending}
          disabled={urlCount === 0 || !replizAccountId}
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
                      <Badge
                        color={result.ok ? "green" : "red"}
                        variant="light"
                      >
                        {result.ok ? "terjadwal" : "gagal"}
                      </Badge>
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
