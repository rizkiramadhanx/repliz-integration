import type { typeAccountType } from "@/features/master-data/account/type";
import { JsonInput, PasswordInput, TextInput } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

// Editor cookie dipisah jadi komponen sendiri karena butuh state teks mentah.
// Kalau nilai textarea di-render langsung dari JSON.stringify(value.cookies),
// setiap ketikan yang membuat JSON sementara tidak valid akan gagal di-parse,
// state tidak berubah, dan textarea langsung kembali ke nilai lama — sehingga
// praktis mustahil mengetik atau menempel JSON.
function CookiesInput({
  cookies,
  onChangeCookies,
}: {
  cookies: unknown;
  onChangeCookies: (cookies: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    JSON.stringify(cookies ?? [], null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  // Menandai perubahan yang berasal dari ketikan sendiri, supaya sinkronisasi
  // dari props di bawah tidak menimpa teks yang sedang diedit pengguna.
  const isEditing = useRef(false);

  // Sinkron saat data datang dari luar (mis. modal edit memuat akun lain).
  useEffect(() => {
    if (isEditing.current) {
      isEditing.current = false;
      return;
    }
    setText(JSON.stringify(cookies ?? [], null, 2));
    setError(null);
  }, [cookies]);

  const handleChange = (nextText: string) => {
    setText(nextText);

    const trimmed = nextText.trim();
    if (trimmed === "") {
      isEditing.current = true;
      setError(null);
      onChangeCookies([]);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        setError("Cookies harus berupa array JSON");
        return;
      }
      isEditing.current = true;
      setError(null);
      onChangeCookies(parsed);
    } catch {
      // JSON belum lengkap saat diketik — tampilkan peringatan, tapi teks
      // yang sedang diketik tetap dipertahankan.
      setError("JSON belum valid");
    }
  };

  return (
    <JsonInput
      mt="sm"
      label="Cookies (JSON array)"
      description='Export cookie session dari browser, format: [{"name":"...","value":"...","domain":"..."}]'
      placeholder='[{"name":"sessionid","value":"...","domain":".instagram.com"}]'
      minRows={6}
      autosize
      value={text}
      onChange={handleChange}
      error={error}
      formatOnBlur
    />
  );
}

export default function CredentialsFields({
  type,
  value,
  onChange,
}: {
  type: typeAccountType;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  if (
    type === "twitter" ||
    type === "facebook" ||
    type === "instagram" ||
    type === "tiktok"
  ) {
    return (
      <>
        <TextInput
          label="Username"
          description="Username akun ini (tanpa @)"
          placeholder="mis. wanitaberkelas"
          value={(value.username as string) ?? ""}
          onChange={(e) =>
            onChange({ ...value, username: e.currentTarget.value })
          }
        />
        <CookiesInput
          cookies={value.cookies}
          onChangeCookies={(cookies) => onChange({ ...value, cookies })}
        />
      </>
    );
  }

  if (type === "telegram") {
    return (
      <>
        <PasswordInput
          label="Bot Token"
          description="Dari @BotFather"
          value={(value.botToken as string) ?? ""}
          onChange={(e) =>
            onChange({ ...value, botToken: e.currentTarget.value })
          }
        />
        <TextInput
          mt="sm"
          label="Chat ID"
          description="ID chat/channel/group tujuan post"
          value={(value.chatId as string) ?? ""}
          onChange={(e) =>
            onChange({ ...value, chatId: e.currentTarget.value })
          }
        />
      </>
    );
  }

  return (
    <PasswordInput
      label="Discord Token"
      value={(value.token as string) ?? ""}
      onChange={(e) => onChange({ ...value, token: e.currentTarget.value })}
    />
  );
}
