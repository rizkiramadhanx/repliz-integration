import NotFound from "@/components/page/page-not-found";
import AuthenticationRoutes from "@/routes/authentication";
import GuideRoutes from "@/routes/guide";
import { BrowserRouter, useRoutes } from "react-router";
import MasterDataRoutes from "@/routes/master-data";
import ReplizRoutes from "@/routes/repliz";
import ReplizSyncRoutes from "@/routes/repliz-sync";

function AllRoutes() {
  const routes = useRoutes([
    ...AuthenticationRoutes,
    ...MasterDataRoutes,
    ...ReplizRoutes,
    ...ReplizSyncRoutes,
    ...GuideRoutes,
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
