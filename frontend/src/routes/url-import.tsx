import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageUrlImport from "@/features/url-import/page-url-import";
import { RouteObject } from "react-router";

const UrlImportRoutes: RouteObject[] = [
  {
    path: "/url-import",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageUrlImport />,
      },
    ],
  },
];

export default UrlImportRoutes;
