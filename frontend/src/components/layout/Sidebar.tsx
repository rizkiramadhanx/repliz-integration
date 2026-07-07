import SidebarMenu, {
  type SidebarMenuChild,
  type SidebarMenuItem,
} from "@/enum/sidebar";
import useNavigationStore from "@/store/navigation";
import useUserStore from "@/store/user";
import { Box, Collapse, useMantineColorScheme } from "@mantine/core";
import { useMemo, useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router";
import { useMediaQuery } from "@mantine/hooks";

function userHasAnyModule(
  userModules: string[] | undefined,
  itemModules: string[] | undefined,
): boolean {
  if (!itemModules?.length) return false;
  if (!userModules?.length) return false;
  return itemModules.some((m) => userModules.includes(m));
}

function getVisibleMenu(
  menu: SidebarMenuItem[],
  userModules: string[] | undefined,
): Array<SidebarMenuItem & { visibleChildren?: SidebarMenuChild[] }> {
  return menu
    .map((item) => {
      if (item.children?.length) {
        const visibleChildren = item.children.filter((child) =>
          userHasAnyModule(userModules, child.modules),
        );
        if (visibleChildren.length === 0) return null;
        return { ...item, visibleChildren };
      }
      if (!item.modules?.length) {
        return { ...item, visibleChildren: undefined };
      }
      if (userHasAnyModule(userModules, item.modules)) {
        return { ...item, visibleChildren: undefined };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

export default function SidebarResponsive() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const isDark = useMantineColorScheme().colorScheme === "dark";

  const { isSidebarOpen, isSidebarOpenMobile, toggleSidebarMobile } =
    useNavigationStore();

  const userModules = useUserStore((s) => s.user?.user?.role?.actions);

  const visibleMenu = useMemo(
    () => getVisibleMenu(SidebarMenu, userModules),
    [userModules],
  );

  const sidebarVisible = isMobile ? isSidebarOpenMobile : isSidebarOpen;

  const toggleDropdown = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  useEffect(() => {
    const activeItemIndex = visibleMenu.findIndex((item) => {
      const children = item.visibleChildren ?? item.children;
      return (
        children?.some((child) => pathname.startsWith(child.path)) ||
        (item.path != null && pathname.startsWith(item.path))
      );
    });

    if (activeItemIndex !== -1) {
      setOpenIndex(activeItemIndex);
    }
  }, [pathname, visibleMenu]);

  return (
    <Box
      sx={{
        width: isMobile ? "100%" : "250px",
        minHeight: "100vh",
        backgroundColor: isDark ? "var(--mantine-color-gray-8)" : "whitesmoke",
        paddingBottom: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: isDark
          ? "1px solid var(--mantine-color-gray-7)"
          : "1px solid var(--mantine-color-gray-3)",
        position: "fixed",
        left: 0,
        top: "65px",
        transform: sidebarVisible ? "translateX(0)" : "translateX(-100%)",
        opacity: sidebarVisible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
        zIndex: 10,
        overflowX: "hidden",
      }}
    >
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "5px",
        }}
      >
        {visibleMenu.map((item, index) => {
          const childrenToShow = item.visibleChildren ?? item.children;
          const isOpen = openIndex === index;
          const hasChildren =
            childrenToShow != null && childrenToShow.length > 0;

          const handleClick = () => {
            if (hasChildren) {
              toggleDropdown(index);
            } else {
              if (item.path) {
                if (isMobile) toggleSidebarMobile();
                navigate(item.path);
              }
            }
          };

          return (
            <Box key={index}>
              <Box
                sx={() => {
                  return {
                    backgroundColor: isDark
                      ? "var(--mantine-color-gray-7)"
                      : "var(--mantine-color-primary-6)",
                    borderRadius: "5px",
                    width: "100%",
                    color: "white",
                    padding: "10px",
                    display: "flex",
                    cursor: "pointer",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "center",
                    transition: "background-color 0.3s",
                    "&:hover": {
                      backgroundColor: isDark
                        ? "var(--mantine-color-gray-7)"
                        : "var(--mantine-color-primary-6)",
                    },
                  };
                }}
                onClick={handleClick}
              >
                <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Box mt={2} mr={4}>
                    {item.icon}
                  </Box>
                  {item.title}
                </Box>
                {hasChildren && (
                  <Box
                    sx={{
                      transition: "transform 0.3s",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <FaChevronDown />
                  </Box>
                )}
              </Box>

              {hasChildren && (
                <Collapse in={isOpen} mt={"4px"} transitionDuration={300}>
                  <Box
                    sx={{
                      mt: "2px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      transform: isOpen ? "scaleY(1)" : "scaleY(0)",
                      transformOrigin: "top",
                      transition: "all 0.3s ease-in-out",
                    }}
                  >
                    {(childrenToShow ?? []).map((child, childIndex) => {
                      const isChildActive = pathname === child.path;

                      return (
                        <Box
                          key={childIndex}
                          onClick={() => {
                            if (isMobile) toggleSidebarMobile();
                            navigate(child.path);
                          }}
                          sx={{
                            padding: "8px",
                            borderRadius: "5px",
                            color: "black",
                            backgroundColor: isChildActive
                              ? isDark
                                ? "var(--mantine-color-primary-6)"
                                : "var(--mantine-color-primary-2)"
                              : "white",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: isDark
                                ? "var(--mantine-color-gray-7)"
                                : "var(--mantine-color-primary-2)",
                            },
                          }}
                        >
                          <Box mt={2} mr={4}>
                            {child.icon}
                          </Box>
                          {child.title}
                        </Box>
                      );
                    })}
                  </Box>
                </Collapse>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
