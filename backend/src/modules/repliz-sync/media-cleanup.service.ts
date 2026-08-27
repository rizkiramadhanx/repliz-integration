import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ReplizService } from '../repliz/repliz.service';
import { UrlImportHistoryEntity } from './entities/url-import-history.entity';
import { statfs } from 'fs/promises';
import {
  REPLIZ_MEDIA_DIR,
  deleteMediaFiles,
  listMediaFiles,
  mediaFilenameFromUrl,
} from './worker/public-media.util';

export type MediaCleanupPreview = {
  totalFiles: number;
  totalBytes: number;
  staleFiles: number;
  staleBytes: number;
  keptInUse: number;
  cutoff: string;
  // Kapasitas disk tempat media disimpan. null bila tidak terbaca (statfs
  // bisa gagal di sebagian filesystem/container) — UI menyembunyikannya
  // ketimbang menampilkan angka nol yang menyesatkan.
  disk: { totalBytes: number; freeBytes: number; usedBytes: number } | null;
  files: { filename: string; bytes: number; modifiedAt: string }[];
};

export type MediaCleanupResult = {
  deleted: number;
  bytesFreed: number;
  failed: string[];
};

// Media yang jadwalnya belum lewat masih akan diunduh server Repliz saat
// postingan terbit, jadi berkasnya tidak boleh dihapus lebih dulu. Jeda ini
// memberi bantalan untuk jadwal yang baru saja terbit atau tertunda.
//
// 24 jam, bukan 48: disk VPS lebih cepat penuh daripada bantalannya terpakai.
// Memperpendeknya aman karena berkas yang masih ditunggu jadwal PENDING di
// Repliz sudah dilindungi terpisah lewat filenamesScheduledInRepliz() —
// bantalan ini hanya menangani jadwal yang SUDAH terbit tetapi mungkin masih
// diunduh ulang Repliz.
const SAFETY_HOURS = 24;

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    @InjectRepository(UrlImportHistoryEntity)
    private readonly historyRepo: Repository<UrlImportHistoryEntity>,
    private readonly replizService: ReplizService,
  ) {}

  // Berkas yang masih ditunggu jadwal PENDING di Repliz, dibaca langsung dari
  // Repliz dan bukan dari tabel kita.
  //
  // Riwayat impor URL bukan satu-satunya yang menaruh berkas di direktori ini:
  // sinkronisasi otomatis (repliz-sync.service.ts) juga mengunduh ke sana,
  // tetapi mencatatnya di tabel lain. Berkas seperti itu tidak pernah terlihat
  // sebagai "terpakai", sehingga terhapus 48 jam setelah diunduh walau
  // jadwalnya masih menunggu berhari-hari kemudian — dan Repliz gagal
  // mengunduhnya saat waktu terbit tiba.
  //
  // Jadwal di Repliz adalah sumber kebenaran untuk pertanyaan "berkas ini
  // masih dibutuhkan atau tidak", apa pun jalur yang membuatnya.
  private async filenamesScheduledInRepliz(): Promise<Set<string>> {
    const inUse = new Set<string>();
    let page = 1;

    // Dibatasi agar kegagalan paginasi tidak berubah menjadi perulangan tanpa
    // akhir. 100 halaman × 100 = 10.000 jadwal pending, jauh di atas pemakaian
    // wajar; bila tercapai, lebih baik berhenti dan menghapus lebih sedikit.
    const MAX_PAGES = 100;

    for (; page <= MAX_PAGES; page += 1) {
      const result = await this.replizService.listSchedules({
        page,
        limit: 100,
        status: 'pending',
      });

      for (const schedule of result?.docs ?? []) {
        for (const media of schedule?.medias ?? []) {
          const filename = mediaFilenameFromUrl(media?.url ?? '');
          if (filename) inUse.add(filename);
        }
      }

      if (page >= (result?.totalPages ?? 1)) break;
    }

    return inUse;
  }

  // Berkas yang dipakai jadwal mendatang, dikumpulkan dari riwayat impor.
  // Baris tanpa scheduledAt ikut dianggap terpakai: tanpa tanggal, tidak ada
  // dasar untuk menyatakan berkasnya sudah lewat.
  private async filenamesInUse(cutoff: Date): Promise<Set<string>> {
    const rows = await this.historyRepo.find({
      where: [
        { scheduledAt: MoreThanOrEqual(cutoff) },
        { scheduledAt: null as unknown as Date },
      ],
      select: { mediaUrls: true },
    });

    const inUse = new Set<string>();
    for (const row of rows) {
      for (const url of row.mediaUrls ?? []) {
        const filename = mediaFilenameFromUrl(url);
        if (filename) inUse.add(filename);
      }
    }
    return inUse;
  }

  // Sisa ruang disk yang menampung folder media. Dipakai UI supaya pengguna
  // tahu kapan harus membersihkan — ukuran folder media saja tidak cukup,
  // karena yang menentukan impor gagal adalah penuhnya disk VPS.
  private async diskUsage(): Promise<{
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
  } | null> {
    try {
      const stat = await statfs(REPLIZ_MEDIA_DIR);
      const totalBytes = stat.blocks * stat.bsize;
      // bavail (bukan bfree): sebagian blok dicadangkan untuk root dan tidak
      // bisa dipakai proses biasa, jadi bfree melebih-lebihkan sisa nyata.
      const freeBytes = stat.bavail * stat.bsize;
      return { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes };
    } catch (error) {
      this.logger.warn(
        `Tidak bisa membaca kapasitas disk: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private cutoffDate(): Date {
    return new Date(Date.now() - SAFETY_HOURS * 60 * 60 * 1000);
  }

  // Menghitung apa yang akan terhapus TANPA menghapusnya. Dipakai UI untuk
  // menampilkan angka sebelum pengguna menekan tombol.
  async preview(): Promise<MediaCleanupPreview> {
    const cutoff = this.cutoffDate();
    // Dua sumber digabung: riwayat impor kita DAN jadwal pending di Repliz.
    // Kegagalan membaca Repliz tidak boleh berujung penghapusan massal, jadi
    // errornya dibiarkan naik dan membatalkan pembersihan.
    const inUse = new Set([
      ...(await this.filenamesInUse(cutoff)),
      ...(await this.filenamesScheduledInRepliz()),
    ]);
    const files = listMediaFiles();

    const stale = files.filter(
      (file) => !inUse.has(file.filename) && file.modifiedAt < cutoff,
    );

    return {
      disk: await this.diskUsage(),
      totalFiles: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
      staleFiles: stale.length,
      staleBytes: stale.reduce((sum, file) => sum + file.bytes, 0),
      keptInUse: files.length - stale.length,
      cutoff: cutoff.toISOString(),
      files: stale
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 20)
        .map((file) => ({
          filename: file.filename,
          bytes: file.bytes,
          modifiedAt: file.modifiedAt.toISOString(),
        })),
    };
  }

  // Daftar berkas dihitung ulang di sini, bukan diterima dari pemanggil:
  // preview bisa saja sudah basi, dan menerima nama berkas dari luar berarti
  // mempercayai klien untuk memutuskan apa yang boleh dihapus.
  async cleanup(): Promise<MediaCleanupResult> {
    const cutoff = this.cutoffDate();
    // Dua sumber digabung: riwayat impor kita DAN jadwal pending di Repliz.
    // Kegagalan membaca Repliz tidak boleh berujung penghapusan massal, jadi
    // errornya dibiarkan naik dan membatalkan pembersihan.
    const inUse = new Set([
      ...(await this.filenamesInUse(cutoff)),
      ...(await this.filenamesScheduledInRepliz()),
    ]);
    const stale = listMediaFiles().filter(
      (file) => !inUse.has(file.filename) && file.modifiedAt < cutoff,
    );

    const result = deleteMediaFiles(stale.map((file) => file.filename));
    this.logger.log(
      `Pembersihan media: ${result.deleted} berkas dihapus, ${Math.round(result.bytesFreed / 1024 / 1024)} MB dibebaskan, ${result.failed.length} gagal`,
    );
    return result;
  }
}
