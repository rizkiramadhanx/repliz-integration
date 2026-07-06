import useNavigationStore from "@/store/navigation";
import { Box } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout() {
  const { isSidebarOpen } = useNavigationStore();

  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isMobile) {
      useNavigationStore.setState({ isSidebarOpen: false });
    }
  }, [isMobile]);

  return (
    <Box>
      <Topbar />
      <Sidebar />
      <Box
        sx={{
          minHeight: "100vh",
          marginLeft: isSidebarOpen ? "250px" : "0",
          transition: "margin-left 0.8s ease",
          paddingTop: "65px",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
