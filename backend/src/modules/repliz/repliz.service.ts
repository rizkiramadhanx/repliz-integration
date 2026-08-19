import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

export type ReplizAccount = {
  id: string;
  _id: string;
  generatedId: string;
  name: string;
  username: string;
  picture: string;
  isConnected: boolean;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export type ReplizPaginated<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

export type ReplizMedia = {
  url: string;
  type: 'image' | 'video';
  thumbnail?: string;
  alt?: string;
};

// Tipe konten yang diterima Repliz. `reel`, `link`, dan `story` belum
// dipakai sync otomatis, tapi ikut didefinisikan supaya pemanggil lain
// tidak perlu mengulang daftar ini.
export type ReplizScheduleType =
  | 'text'
  | 'image'
  | 'video'
  | 'reel'
  | 'album'
  | 'link'
  | 'story';

export type CreateScheduleParams = {
  accountId: string;
  title: string;
  description: string;
  type: ReplizScheduleType;
  medias: ReplizMedia[];
  scheduleAt: string;
};

export type ReplizSchedule = {
  _id: string;
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  scheduleAt: string;
  accountId: string;
  medias?: { url: string; type: string; thumbnail?: string }[];
  createdAt: string;
};

export type ListScheduleParams = {
  page?: number;
  limit?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  accountIds?: string[];
};

export type ListAccountParams = {
  page?: number;
  limit?: number;
  search?: string;
  types?: string[];
};

@Injectable()
export class ReplizService {
  private readonly logger = new Logger(ReplizService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseUrl =
      this.configService.get<string>('repliz.baseUrl') ||
      'https://api.repliz.com';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  // Kredensial dibaca per-request (bukan sekali di constructor) supaya
  // perubahan .env cukup restart tanpa menyentuh kode, dan supaya pesan
  // errornya jelas saat env belum diisi.
  private authHeader(): string {
    const accessKey = this.configService.get<string>('repliz.accessKey');
    const secretKey = this.configService.get<string>('repliz.secretKey');

    if (!accessKey || !secretKey) {
      throw new ServiceUnavailableException(
        'REPLIZ_ACCESS_KEY / REPLIZ_SECRET_KEY belum dikonfigurasi di server',
      );
    }

    const encoded = Buffer.from(`${accessKey}:${secretKey}`).toString('base64');
    return `Basic ${encoded}`;
  }

  // Error dari Repliz ({code, message}) diterjemahkan jadi HttpException
  // dengan status yang sama, supaya frontend bisa membedakan 401 (kredensial
  // salah) dari 404 (akun tidak ada) tanpa menebak dari teks pesan.
  private toHttpException(error: unknown, fallbackMessage: string): never {
    const axiosError = error as AxiosError<{ code?: number; message?: string }>;
    const status =
      axiosError.response?.status ?? HttpStatus.SERVICE_UNAVAILABLE;
    const message =
      axiosError.response?.data?.message ??
      axiosError.message ??
      fallbackMessage;

    this.logger.error(`Repliz API error (${status}): ${message}`);
    throw new HttpException(`Repliz: ${message}`, status);
  }

  async listAccounts(
    params: ListAccountParams = {},
  ): Promise<ReplizPaginated<ReplizAccount>> {
    const { page = 1, limit = 20, search, types } = params;

    // Repliz mengharapkan types sebagai types[0], types[1], ... bukan
    // types=a&types=b — jadi disusun manual, bukan lewat paramsSerializer.
    const query: Record<string, string | number> = { page, limit };
    if (search) query.search = search;
    types?.forEach((type, index) => {
      query[`types[${index}]`] = type;
    });

    try {
      const response = await this.client.get<ReplizPaginated<ReplizAccount>>(
        '/public/account',
        {
          headers: { Authorization: this.authHeader() },
          params: query,
        },
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.toHttpException(error, 'Gagal mengambil daftar akun Repliz');
    }
  }

  async createSchedule(
    params: CreateScheduleParams,
  ): Promise<{ scheduleId: string }> {
    try {
      const response = await this.client.post<{ scheduleId: string }>(
        '/public/schedule',
        {
          title: params.title,
          description: params.description,
          type: params.type,
          medias: params.medias,
          accountId: params.accountId,
          scheduleAt: params.scheduleAt,
        },
        { headers: { Authorization: this.authHeader() } },
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.toHttpException(error, 'Gagal membuat jadwal di Repliz');
    }
  }

  async listSchedules(
    params: ListScheduleParams = {},
  ): Promise<ReplizPaginated<ReplizSchedule>> {
    const { page = 1, limit = 50, status, fromDate, toDate, accountIds } =
      params;

    const query: Record<string, string | number> = { page, limit };
    if (status) query.status = status;
    if (fromDate) query.fromDate = fromDate;
    if (toDate) query.toDate = toDate;
    accountIds?.forEach((id, index) => {
      query[`accountIds[${index}]`] = id;
    });

    try {
      const response = await this.client.get<ReplizPaginated<ReplizSchedule>>(
        '/public/schedule',
        {
          headers: { Authorization: this.authHeader() },
          params: query,
        },
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.toHttpException(error, 'Gagal mengambil jadwal Repliz');
    }
  }

  // Repliz mengharapkan scheduleIds[]=a&scheduleIds[]=b pada query string
  // (bukan body), jadi disusun manual — axios `params` dengan array akan
  // menghasilkan scheduleIds[0]=a yang tidak dikenali endpoint ini.
  async deleteSchedules(scheduleIds: string[]): Promise<number> {
    if (scheduleIds.length === 0) return 0;

    const query = scheduleIds
      .map((id) => `scheduleIds[]=${encodeURIComponent(id)}`)
      .join('&');

    try {
      await this.client.delete(`/public/schedule/mass?${query}`, {
        headers: { Authorization: this.authHeader() },
      });
      return scheduleIds.length;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.toHttpException(error, 'Gagal menghapus jadwal Repliz');
    }
  }

  async countAccounts(): Promise<unknown> {
    try {
      const response = await this.client.get('/public/account/count', {
        headers: { Authorization: this.authHeader() },
      });
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.toHttpException(error, 'Gagal mengambil jumlah akun Repliz');
    }
  }
}
