import { MODULE_LIST } from "@/enum/module";
import { ROUTES } from "@/enum/routes";
import { ReactNode } from "react";
import { BiUser } from "react-icons/bi";
import { FaDatabase } from "react-icons/fa";
import { HiShieldCheck } from "react-icons/hi";
import { MdHelpOutline } from "react-icons/md";
import { TbBrandCampaignmonitor, TbRefreshDot } from "react-icons/tb";
import { FaUserShield } from "react-icons/fa6";

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
    ],
  },
  {
    title: "Account",
    icon: <FaUserShield />,
    path: ROUTES.MasterData.Account.View,
    modules: [MODULE_LIST.MasterData.Account.Read],
  },
  {
    title: "Repliz",
    icon: <TbBrandCampaignmonitor />,
    path: ROUTES.Repliz.View,
    modules: [MODULE_LIST.Repliz.Read],
  },
  {
    title: "Sinkronisasi Repliz",
    icon: <TbRefreshDot />,
    path: ROUTES.ReplizSync.View,
    modules: [MODULE_LIST.ReplizSync.Read],
  },
  {
    title: "Panduan",
    icon: <MdHelpOutline />,
    path: ROUTES.Guide.View,
  },
];

export default SidebarMenu;
