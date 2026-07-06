import { createTheme, virtualColor } from "@mantine/core";

const customTheme = createTheme({
  components: {
    modalTitle: {
      styles: () => ({
        title: {
          fontWeight: 600,
        },
      }),
    },
    Table: {
      styles: () => ({
        table: { whiteSpace: "nowrap" },
        thead: { whiteSpace: "nowrap" },
        tbody: { whiteSpace: "nowrap" },
        th: { whiteSpace: "nowrap" },
        td: { whiteSpace: "nowrap" },
      }),
    },
    Input: {
      styles: () => ({
        input: {
          borderColor: "var(--mantine-color-primary-4)",

          "&:focus, &:focus-within": {
            borderColor: "var(--mantine-color-primary-6)",
          },
        },
      }),
    },
    Switch: {
      defaultProps: {
        color: "primary",
      },
    },
    TextInput: {
      styles: () => ({
        input: {
          borderColor: "var(--mantine-color-primary-4)",

          "&:focus, &:focus-within": {
            borderColor: "var(--mantine-color-primary-6)",
          },
        },
      }),
    },
  },
  colors: {
    orange: [
      "#fff0e2",
      "#ffdfcc",
      "#ffbe9b",
      "#fd9b66",
      "#fc8849",
      "#fb6a1c",
      "#fc600a",
      "#e15000",
      "#c94500",
      "#af3900",
    ],
    green: [
      "#e0f3e8",
      "#c0e7d2",
      "#9edcbb",
      "#7cd0a3",
      "#58c58b",
      "#38b972",
      "#289350",
      "#1f6f3c",
      "#154b28",
      "#0a2714",
    ],
    bri: [
      "#eaf0f7",
      "#d5e2ef",
      "#abc5df",
      "#81a7cf",
      "#5789bf",
      "#2d6baf",
      "#005596",
      "#004b84",
      "#003c6a",
      "#002848",
    ],
    primary: virtualColor({
      name: "primary",
      dark: "bri",
      light: "bri",
    }),
  },
  fontFamily: "Inter, sans-serif",
});
export default customTheme;
