import { Accordion, Alert, Anchor, Code, List, Stack, Text, Title } from "@mantine/core";

export default function PageGuide() {
  return (
    <Stack>
      <Title order={2}>Panduan Ambil Kredensial Akun</Title>
      <Alert color="yellow" title="Perhatian">
        Cookie Instagram/Twitter/Facebook dan token Discord (self-bot) adalah data sensitif yang
        setara dengan password akun. Mengambil/menggunakannya untuk automasi melanggar Ketentuan
        Layanan platform terkait dan berisiko akun disuspend atau di-banned permanen. Gunakan
        hanya untuk akun yang memang siap menanggung risiko tersebut.
      </Alert>

      <Accordion variant="separated" defaultValue="instagram">
        <Accordion.Item value="instagram">
          <Accordion.Control>Instagram (cookie)</Accordion.Control>
          <Accordion.Panel>
            <List type="ordered" spacing="xs">
              <List.Item>
                Login ke <Code>instagram.com</Code> di browser Chrome/Edge menggunakan akun yang
                mau dipakai.
              </List.Item>
              <List.Item>
                Install ekstensi{" "}
                <Anchor
                  href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                  target="_blank"
                >
                  Cookie-Editor
                </Anchor>{" "}
                (atau ekstensi sejenis "EditThisCookie").
              </List.Item>
              <List.Item>
                Buka tab instagram.com yang sudah login, klik ikon Cookie-Editor.
              </List.Item>
              <List.Item>
                Klik tombol <b>Export</b> → pilih format <b>JSON</b> → copy semua isinya.
              </List.Item>
              <List.Item>
                Di form "Tambah Akun" tipe <b>Instagram</b>, tempel hasil copy tadi ke kolom{" "}
                <b>Cookies (JSON array)</b>.
              </List.Item>
              <List.Item>
                Pastikan cookie <Code>sessionid</Code> ada di dalam list — ini cookie utama yang
                menjaga sesi login.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed" mt="sm">
              Cookie session biasanya bertahan berminggu-minggu, tapi bisa invalid lebih cepat
              kalau logout manual, ganti password, akun kena checkpoint/verifikasi, atau
              Instagram mendeteksi aktivitas mencurigakan. Pakai tombol "Check Connection" di
              halaman Account untuk memastikan cookie masih valid.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="twitter">
          <Accordion.Control>Twitter / X (cookie)</Accordion.Control>
          <Accordion.Panel>
            <List type="ordered" spacing="xs">
              <List.Item>
                Login ke <Code>x.com</Code> di browser Chrome/Edge menggunakan akun yang mau
                dipakai.
              </List.Item>
              <List.Item>
                Install ekstensi{" "}
                <Anchor
                  href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                  target="_blank"
                >
                  Cookie-Editor
                </Anchor>
                .
              </List.Item>
              <List.Item>Buka tab x.com yang sudah login, klik ikon Cookie-Editor.</List.Item>
              <List.Item>
                Klik tombol <b>Export</b> → pilih format <b>JSON</b> → copy semua isinya.
              </List.Item>
              <List.Item>
                Di form "Tambah Akun" tipe <b>Twitter</b>, tempel hasil copy tadi ke kolom{" "}
                <b>Cookies (JSON array)</b>.
              </List.Item>
              <List.Item>
                Pastikan cookie <Code>auth_token</Code> dan <Code>ct0</Code> ada di dalam list —
                dua cookie ini yang dipakai untuk menjaga sesi login.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed" mt="sm">
              Cookie session biasanya bertahan berminggu-minggu, tapi bisa invalid lebih cepat
              kalau logout manual, ganti password, atau X mendeteksi aktivitas mencurigakan.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="facebook">
          <Accordion.Control>Facebook (cookie)</Accordion.Control>
          <Accordion.Panel>
            <List type="ordered" spacing="xs">
              <List.Item>
                Login ke <Code>facebook.com</Code> di browser menggunakan akun yang mau dipakai.
              </List.Item>
              <List.Item>
                Install ekstensi{" "}
                <Anchor
                  href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                  target="_blank"
                >
                  Cookie-Editor
                </Anchor>
                .
              </List.Item>
              <List.Item>Buka tab facebook.com yang sudah login, klik ikon Cookie-Editor.</List.Item>
              <List.Item>
                Klik <b>Export</b> → format <b>JSON</b> → copy semua isinya.
              </List.Item>
              <List.Item>
                Tempel ke kolom <b>Cookies (JSON array)</b> di form akun tipe <b>Facebook</b>.
              </List.Item>
              <List.Item>
                Pastikan cookie <Code>c_user</Code> dan <Code>xs</Code> ada — keduanya wajib
                untuk sesi login tetap valid.
              </List.Item>
            </List>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="telegram">
          <Accordion.Control>Telegram (Bot Token + Chat ID)</Accordion.Control>
          <Accordion.Panel>
            <Text fw={600} size="sm" mt="xs">
              1. Buat Bot & dapatkan Bot Token
            </Text>
            <List type="ordered" spacing="xs">
              <List.Item>
                Buka chat dengan{" "}
                <Anchor href="https://t.me/BotFather" target="_blank">
                  @BotFather
                </Anchor>{" "}
                di Telegram.
              </List.Item>
              <List.Item>
                Kirim perintah <Code>/newbot</Code>, ikuti instruksi (kasih nama & username bot).
              </List.Item>
              <List.Item>
                BotFather akan membalas dengan token, formatnya seperti{" "}
                <Code>123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</Code>. Ini yang dipakai
                sebagai <b>Bot Token</b>.
              </List.Item>
            </List>
            <Text fw={600} size="sm" mt="md">
              2. Dapatkan Chat ID
            </Text>
            <List type="ordered" spacing="xs">
              <List.Item>
                Untuk posting ke chat pribadi: mulai chat dengan bot kamu, kirim pesan apa saja,
                lalu buka <Code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</Code> di
                browser — cari field <Code>chat.id</Code> di response JSON-nya.
              </List.Item>
              <List.Item>
                Untuk posting ke grup: invite bot ke grup, kirim pesan di grup, lalu buka URL{" "}
                <Code>getUpdates</Code> yang sama — <Code>chat.id</Code> grup biasanya berupa
                angka negatif.
              </List.Item>
              <List.Item>
                Untuk posting ke channel: jadikan bot sebagai admin channel, lalu Chat ID channel
                biasanya berformat <Code>@nama_channel</Code> atau angka negatif diawali{" "}
                <Code>-100</Code>.
              </List.Item>
            </List>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="discord">
          <Accordion.Control>Discord (Token akun / self-bot)</Accordion.Control>
          <Accordion.Panel>
            <Alert color="red" mb="sm">
              Ini token akun Discord pribadi (self-bot), bukan Bot API resmi. Menggunakannya
              untuk automasi melanggar Discord ToS dan berisiko akun personal terkena banned
              permanen.
            </Alert>
            <List type="ordered" spacing="xs">
              <List.Item>
                Buka Discord di browser (bukan aplikasi desktop), login ke akun yang dipakai.
              </List.Item>
              <List.Item>
                Tekan <Code>F12</Code> atau <Code>Ctrl+Shift+I</Code> untuk buka Developer Tools,
                pindah ke tab <b>Network</b>.
              </List.Item>
              <List.Item>
                Ketik apa saja / navigasi di Discord supaya ada request baru muncul di tab
                Network, klik salah satu request ke <Code>discord.com/api/...</Code>.
              </List.Item>
              <List.Item>
                Lihat bagian <b>Request Headers</b>, cari header <Code>authorization</Code> —
                nilainya adalah token akun kamu.
              </List.Item>
              <List.Item>
                Cara lain: tab <b>Console</b> di Developer Tools, jalankan script pencari token
                (banyak tersedia di komunitas), lalu copy hasilnya.
              </List.Item>
              <List.Item>
                Tempel ke kolom <b>Discord Token</b> di form akun tipe <b>Discord</b>.
              </List.Item>
            </List>
            <Text size="sm" c="dimmed" mt="sm">
              Untuk mendapatkan Channel ID: aktifkan Developer Mode di Discord (Settings →
              Advanced → Developer Mode), lalu klik kanan channel yang dimaksud → Copy Channel
              ID.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
