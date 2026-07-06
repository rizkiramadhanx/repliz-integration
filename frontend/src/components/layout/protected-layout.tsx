import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

const protectedPath = ["/master-data", "/log"];
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();

  const navigate = useNavigate();

  const { pathname } = location;

  const token = localStorage.getItem("token");

  useEffect(() => {
    const isProtectedPath = protectedPath.some((path) =>
      pathname.startsWith(path),
    );

    if (!token && isProtectedPath) {
      navigate("/login");
    }
  }, []);

  return children;
}
