import type { typeDataReplizAccount } from "./type";

// URL profil dibangun dari username karena itu satu-satunya field yang
// dipakai semua platform. `generatedId` sengaja tidak dipakai sebagai
// dasar URL — nilainya ID internal platform (mis. IG user id
// 17841433574114864), bukan bagian dari URL profil publik.
//
// Facebook adalah pengecualian dan urutannya DIBALIK: untuk akun Page,
// Repliz mengisi `username` dengan KATEGORI Page ("Recruiter", "Clothing
// (Brand)", "Shopping & retail"), bukan vanity URL — memakainya
// menghasilkan tautan ke halaman yang salah. `generatedId` berisi Page ID
// asli yang selalu valid lewat /profile.php?id=, jadi itu yang didahulukan.
const PROFILE_URL_BUILDER: Record<
  string,
  (account: typeDataReplizAccount) => string | null
> = {
  instagram: (a) => (a.username ? `https://www.instagram.com/${a.username}` : null),
  threads: (a) => (a.username ? `https://www.threads.com/@${a.username}` : null),
  tiktok: (a) => (a.username ? `https://www.tiktok.com/@${a.username}` : null),
  youtube: (a) => (a.username ? `https://www.youtube.com/@${a.username}` : null),
  linkedin: (a) => (a.username ? `https://www.linkedin.com/in/${a.username}` : null),
  facebook: (a) =>
    a.generatedId
      ? `https://www.facebook.com/profile.php?id=${a.generatedId}`
      : a.username
        ? `https://www.facebook.com/${a.username}`
        : null,
  shopee: (a) => (a.username ? `https://shopee.co.id/${a.username}` : null),
};

export function buildProfileUrl(
  account: typeDataReplizAccount,
): string | null {
  const builder = PROFILE_URL_BUILDER[account.type?.toLowerCase()];
  return builder ? builder(account) : null;
}
