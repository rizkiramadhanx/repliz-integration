import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageGuide from "@/features/guide/page-guide";
import { RouteObject } from "react-router";

const GuideRoutes: RouteObject[] = [
  {
    path: "/guide",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageGuide />,
      },
    ],
  },
];

export default GuideRoutes;
