import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import store from "store2";
import { ROUTES } from "@/enum/routes";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  useEffect(() => {
    const token = store.get("token");
    if (!token) {
      navigate(ROUTES.Authentication.Login);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return children;
}
