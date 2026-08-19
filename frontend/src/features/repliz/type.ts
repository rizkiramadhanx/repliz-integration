export type typeDataReplizAccount = {
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

// Bentuk paginasi bawaan Repliz (mongoose-paginate), beda dari meta
// {page,limit,total,total_page} milik API internal — jadi tidak bisa
// dipakaikan komponen paginasi yang sama tanpa pemetaan.
export type typeDataReplizPaginated<T> = {
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
