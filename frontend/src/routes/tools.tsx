import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageTools from "@/features/tools/page-tools";
import { RouteObject } from "react-router";

const ToolsRoutes: RouteObject[] = [
  {
    path: "/tools",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageTools />,
      },
    ],
  },
];

export default ToolsRoutes;
