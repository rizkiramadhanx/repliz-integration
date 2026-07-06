import GuestLayout from "@/components/layout/guest-layout";
import Login from "@/features/authentication/login/page-login";
import { Navigate, type RouteObject } from "react-router";

const AuthenticationRoutes: RouteObject[] = [
  {
    path: "/",
    element: <GuestLayout />,
    children: [
      {
        index: true, // default page for /
        element: <Navigate to="/login" replace />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <h2>Register</h2>,
      },
    ],
  },
];

export default AuthenticationRoutes;
