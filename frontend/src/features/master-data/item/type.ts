import type { typeDataCategory } from "../category/type";
import type { typeDataBrand } from "../brand/type";

export type typeDataItem = {
  id: string;
  name: string;
  weight: number;
  category_id: string | null;
  category: typeDataCategory | null;
  brand_id: string | null;
  brand: typeDataBrand | null;
  created_at: string;
  updated_at: string;
};

export type typeDataCreateItemPayload = {
  name: string;
  weight: number;
  category_id?: string | null;
  brand_id?: string | null;
};

export type typeDataUpdateItemPayload = {
  name?: string;
  weight?: number;
  category_id?: string | null;
  brand_id?: string | null;
};
