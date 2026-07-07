import { MODULE_LIST } from "@/enum/module";
import { ROUTES } from "@/enum/routes";
import { ReactNode } from "react";
import { BiUser } from "react-icons/bi";
import { FaDatabase } from "react-icons/fa";
import { HiShieldCheck } from "react-icons/hi";
import { MdHistory, MdRule, MdOutlineHistory, MdSchedule, MdHelpOutline, MdBuild } from "react-icons/md";
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
    title: "Auto Post Rule",
    icon: <MdRule />,
    path: ROUTES.MasterData.AutoPostRule.View,
    modules: [MODULE_LIST.MasterData.AutoPostRule.Read],
  },
  {
    title: "Penjadwalan Posting",
    icon: <MdSchedule />,
    path: ROUTES.ScheduledPost.View,
    modules: [MODULE_LIST.ScheduledPost.Read],
  },
  {
    title: "Riwayat Post",
    icon: <MdOutlineHistory />,
    path: ROUTES.PostHistory.View,
    modules: [MODULE_LIST.PostHistory.Read],
  },
  {
    title: "Log Aktivitas",
    icon: <MdHistory />,
    path: ROUTES.Log.View,
    modules: [MODULE_LIST.Log.Read],
  },
  {
    title: "Tools Lainnya",
    icon: <MdBuild />,
    path: ROUTES.Tools.View,
  },
  {
    title: "Panduan",
    icon: <MdHelpOutline />,
    path: ROUTES.Guide.View,
  },
];

export default SidebarMenu;
