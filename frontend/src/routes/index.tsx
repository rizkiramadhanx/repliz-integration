import NotFound from "@/components/page/page-not-found";
import AuthenticationRoutes from "@/routes/authentication";
import GuideRoutes from "@/routes/guide";
import { BrowserRouter, useRoutes } from "react-router";
import MasterDataRoutes from "@/routes/master-data";
import ReplizRoutes from "@/routes/repliz";

function AllRoutes() {
  const routes = useRoutes([
    ...AuthenticationRoutes,
    ...MasterDataRoutes,
    ...ReplizRoutes,
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
