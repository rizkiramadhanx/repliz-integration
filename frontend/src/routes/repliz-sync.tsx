import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageReplizSync from "@/features/repliz-sync/page-repliz-sync";
import { RouteObject } from "react-router";

const ReplizSyncRoutes: RouteObject[] = [
  {
    path: "/repliz-sync",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageReplizSync />,
      },
    ],
  },
];

export default ReplizSyncRoutes;
