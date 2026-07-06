import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageRole from "@/features/master-data/role/page-role";
import PageUser from "@/features/master-data/user/page-user";
import PageItem from "@/features/master-data/item/page-item";
import PageCategory from "@/features/master-data/category/page-category";
import PageBrand from "@/features/master-data/brand/page-brand";

import { RouteObject } from "react-router";

const MasterDataRoutes: RouteObject[] = [
  {
    path: "/master-data",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <h2>Master Data</h2>,
      },
      {
        path: "user",
        element: <PageUser />,
      },
      {
        path: "role",
        element: <PageRole />,
      },
      {
        path: "item",
        element: <PageItem />,
      },
      {
        path: "category",
        element: <PageCategory />,
      },
      {
        path: "brand",
        element: <PageBrand />,
      },
    ],
  },
];

export default MasterDataRoutes;
