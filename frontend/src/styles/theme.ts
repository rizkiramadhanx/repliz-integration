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
          borderColor: "green",

          "&:focus, &:focus-within": {
            borderColor: "green",
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
          borderColor: "green",

          "&:focus, &:focus-within": {
            borderColor: "green",
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
    primary: virtualColor({
      name: "primary",
      dark: "green",
      light: "green",
    }),
  },
  fontFamily: "Inter, sans-serif",
});
export default customTheme;
