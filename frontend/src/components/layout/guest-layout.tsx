import { ROUTES } from "@/enum/routes";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

const guestPath = [ROUTES.Authentication.Login, ROUTES.Authentication.Register];

export default function GuestLayout() {
  const location = useLocation();

  const token = localStorage.getItem("token");

  const navigate = useNavigate();

  const { pathname } = location;

  useEffect(() => {
    const isGuestPath = guestPath.some((path) => pathname.startsWith(path));

     if(token && isGuestPath) {
       navigate(ROUTES.MasterData.User.View);
      }
  }, []);

  return <Outlet />;
}
