import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UrlImportHistoryEntity } from './entities/url-import-history.entity';
import {
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
const SAFETY_HOURS = 48;

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    @InjectRepository(UrlImportHistoryEntity)
    private readonly historyRepo: Repository<UrlImportHistoryEntity>,
  ) {}

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

  private cutoffDate(): Date {
    return new Date(Date.now() - SAFETY_HOURS * 60 * 60 * 1000);
  }

  // Menghitung apa yang akan terhapus TANPA menghapusnya. Dipakai UI untuk
  // menampilkan angka sebelum pengguna menekan tombol.
  async preview(): Promise<MediaCleanupPreview> {
    const cutoff = this.cutoffDate();
    const inUse = await this.filenamesInUse(cutoff);
    const files = listMediaFiles();

    const stale = files.filter(
      (file) => !inUse.has(file.filename) && file.modifiedAt < cutoff,
    );

    return {
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
    const inUse = await this.filenamesInUse(cutoff);
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
