import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageLog from "@/features/log/page-log";
import { RouteObject } from "react-router";

const LogRoutes: RouteObject[] = [
  {
    path: "/log",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageLog />,
      },
    ],
  },
];

export default LogRoutes;
