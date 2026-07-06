import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";
import PageScheduledPost from "@/features/scheduled-post/page-scheduled-post";
import { RouteObject } from "react-router";

const ScheduledPostRoutes: RouteObject[] = [
  {
    path: "/scheduled-post",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      {
        index: true,
        element: <PageScheduledPost />,
      },
    ],
  },
];

export default ScheduledPostRoutes;
