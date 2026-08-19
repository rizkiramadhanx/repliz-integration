import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageRepliz from "@/features/repliz/page-repliz";
import { RouteObject } from "react-router";

const ReplizRoutes: RouteObject[] = [
  {
    path: "/repliz",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageRepliz />,
      },
    ],
  },
];

export default ReplizRoutes;
