import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageRole from "@/features/master-data/role/page-role";
import PageUser from "@/features/master-data/user/page-user";
import PageAccount from "@/features/master-data/account/page-account";
import PageAutoPostRule from "@/features/master-data/auto-post-rule/page-auto-post-rule";

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
        path: "account",
        element: <PageAccount />,
      },
      {
        path: "auto-post-rule",
        element: <PageAutoPostRule />,
      },
    ],
  },
];

export default MasterDataRoutes;
