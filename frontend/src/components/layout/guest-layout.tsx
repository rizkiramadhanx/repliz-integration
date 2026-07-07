import { ROUTES } from "@/enum/routes";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import store from "store2";

export default function GuestLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  useEffect(() => {
    const token = store.get("token");
    if (token) {
      navigate(ROUTES.MasterData.User.View);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return <Outlet />;
}
