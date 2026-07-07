import NotFound from "@/components/page/page-not-found";
import AuthenticationRoutes from "@/routes/authentication";
import GuideRoutes from "@/routes/guide";
import LogRoutes from "@/routes/log";
import PostHistoryRoutes from "@/routes/post-history";
import ScheduledPostRoutes from "@/routes/scheduled-post";
import ToolsRoutes from "@/routes/tools";
import { BrowserRouter, useRoutes } from "react-router";
import MasterDataRoutes from "@/routes/master-data";

function AllRoutes() {
  const routes = useRoutes([
    ...AuthenticationRoutes,
    ...MasterDataRoutes,
    ...LogRoutes,
    ...PostHistoryRoutes,
    ...ScheduledPostRoutes,
    ...GuideRoutes,
    ...ToolsRoutes,
    {
      path: "*",
      element: <NotFound />,
    },
  ]);
  return routes;
}
export default function RoutesGlobal() {
  return (
    <BrowserRouter>
      <AllRoutes />
    </BrowserRouter>
  );
}
