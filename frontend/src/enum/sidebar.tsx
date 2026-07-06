import { MODULE_LIST } from "@/enum/module";
import { ROUTES } from "@/enum/routes";
import { ReactNode } from "react";
import { BiUser } from "react-icons/bi";
import { FaDatabase } from "react-icons/fa";
import { HiShieldCheck } from "react-icons/hi";
import { MdHistory, MdCategory } from "react-icons/md";
import { GiGoldBar } from "react-icons/gi";
import { BsBuildingsFill } from "react-icons/bs";

export type SidebarMenuChild = {
  title: string;
  icon: ReactNode;
  path: string;
  modules?: string[];
};

export type SidebarMenuItem = {
  title: string;
  icon: ReactNode;
  path?: string;
  modules?: string[];
  children?: SidebarMenuChild[];
};

const SidebarMenu: SidebarMenuItem[] = [
  {
    title: "Master Data",
    icon: <FaDatabase />,
    path: ROUTES.MasterData.User.View,
    children: [
      {
        title: "User",
        icon: <BiUser />,
        path: ROUTES.MasterData.User.View,
        modules: [MODULE_LIST.MasterData.User.Read],
      },
      {
        title: "Role",
        icon: <HiShieldCheck />,
        path: ROUTES.MasterData.Role.View,
        modules: [MODULE_LIST.MasterData.Role.Read],
      },
      {
        title: "Item",
        icon: <GiGoldBar />,
        path: ROUTES.MasterData.Item.View,
        modules: [MODULE_LIST.MasterData.Item.Read],
      },
      {
        title: "Kategori",
        icon: <MdCategory />,
        path: ROUTES.MasterData.Category.View,
        modules: [MODULE_LIST.MasterData.Category.Read],
      },
      {
        title: "Brand",
        icon: <BsBuildingsFill />,
        path: ROUTES.MasterData.Brand.View,
        modules: [MODULE_LIST.MasterData.Brand.Read],
      },
    ],
  },
  {
    title: "Log Aktivitas",
    icon: <MdHistory />,
    path: ROUTES.Log.View,
    modules: [MODULE_LIST.Log.Read],
  },
];

export default SidebarMenu;
