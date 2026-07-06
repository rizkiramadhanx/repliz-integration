import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PagePostHistory from "@/features/post-history/page-post-history";
import { RouteObject } from "react-router";

const PostHistoryRoutes: RouteObject[] = [
  {
    path: "/post-history",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PagePostHistory />,
      },
    ],
  },
];

export default PostHistoryRoutes;
