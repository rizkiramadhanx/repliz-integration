// src/lib/day.ts
import dayjs from "dayjs";
import "dayjs/locale/id";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
// import localizedFormat from "dayjs/plugin/localizedFormat";
// import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.locale("id");
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
// dayjs.extend(localizedFormat);
// dayjs.extend(isSameOrAfter);
const day = dayjs;

export default day;
