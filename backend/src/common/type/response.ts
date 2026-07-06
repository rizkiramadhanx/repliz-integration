export interface ResponseMeta {
  page: number;
  limit: number;
  total: number;
  total_page: number;
}

export interface SuccessResponse<T = any> {
  message: string;
  code: number;
  status: 'success';
  meta?: ResponseMeta;
  data: T;
}

export interface ErrorResponse {
  message: string;
  code: number;
  status: 'error';
  data: null;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Helper functions untuk menggantikan ResponseHelper
export const createSuccessResponse = <T = any>(
  message: string,
  data: T = [] as T,
  meta?: ResponseMeta,
): SuccessResponse<T> => ({
  message,
  code: 200,
  status: 'success',
  ...(meta != null && {
    meta: {
      page: Number(meta.page ?? 0),
      limit: Number(meta.limit ?? 0),
      total: Number(meta.total ?? 0),
      total_page: Number(meta.total_page ?? 0),
    },
  }),
  data,
});

export const createErrorResponse = (
  message: string,
  code: number = 400,
): ErrorResponse => ({
  message,
  code,
  status: 'error',
  data: null,
});
