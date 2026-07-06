import useNavigationStore from "@/store/navigation";
import useUserStore from "@/store/user";
import {
  Box,
  Button,
  Popover,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { AiOutlineMenuFold, AiOutlineMenuUnfold } from "react-icons/ai";
import store from "store2";
import { IoMoonSharp, IoSunnyOutline } from "react-icons/io5";

export default function Topbar() {
  const { toggleSidebar, isSidebarOpen, toggleSidebarMobile } =
    useNavigationStore();
  const { setColorScheme } = useMantineColorScheme();
  const isDark = useMantineColorScheme().colorScheme === "dark";

  const { user, deleteUser } = useUserStore();
  const handleLogout = () => {
    window.location.href = "/login";
    deleteUser();
    store.remove("token");
  };

  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Box
      sx={{
        width: "100%",
        backgroundColor: isDark ? "var(--mantine-color-gray-8)" : "whitesmoke",
        height: "60px",
        display: "flex",
        position: "fixed",
        alignItems: "center",
        zIndex: 10,
        paddingLeft: "10px",
        paddingRight: "10px",
        justifyContent: "space-between",
        boxShadow: isDark
          ? "0 4px 6px -1px   rgba(0, 0, 0, 0.1)"
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Box display="flex" sx={{ gap: 10, alignItems: "center" }}>
        <Box w={220} display={{ base: "none", md: "flex" }} sx={{ gap: 5 }}>
          <Text fw={800} c="orange" size="lg">
            Boilerplate
          </Text>
          <Text fw={600} c="green" size="lg">
            App
          </Text>
        </Box>
        <Box
          onClick={isMobile ? toggleSidebarMobile : toggleSidebar}
          style={{ cursor: "pointer" }}
        >
          {isSidebarOpen ? (
            <AiOutlineMenuFold size={24} />
          ) : (
            <AiOutlineMenuUnfold size={24} />
          )}
        </Box>
      </Box>
      <Box display="flex" sx={{ gap: 10, alignItems: "center" }}>
        <Switch
          sx={{ cursor: "pointer" }}
          size="md"
          variant="outline"
          checked={isDark}
          color="gray"
          thumbIcon={
            !isDark ? (
              <IoSunnyOutline size={12} color="var(--mantine-color-teal-6)" />
            ) : (
              <IoMoonSharp size={12} color="var(--mantine-color-red-6)" />
            )
          }
          onChange={(e) => {
            if (e.target.checked) {
              setColorScheme("dark");
            } else {
              setColorScheme("light");
            }
          }}
        />
        <Popover width="target" position="bottom" withArrow shadow="sm">
          <Popover.Target>
            <Button
              color="gray"
              size={"md"}
              w={{ base: 100, md: 150 }}
              variant="outline"
            >
              {user?.user.name}
            </Button>
          </Popover.Target>
          <Popover.Dropdown p={2}>
            <Button
              color="red"
              w={{ base: 100, md: 150 }}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Popover.Dropdown>
        </Popover>
      </Box>
    </Box>
  );
}
