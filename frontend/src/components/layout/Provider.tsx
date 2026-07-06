import ReactQueryProvider from "@/libs/react-query";
import customTheme from "@/styles/theme";
import { MantineProvider } from "@mantine/core";
import { emotionTransform, MantineEmotionProvider } from "@mantine/emotion";
import { Notifications } from "@mantine/notifications";

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <MantineProvider
        defaultColorScheme="light"
        theme={customTheme}
        stylesTransform={emotionTransform}
      >
        <MantineEmotionProvider>
          <Notifications position="top-right" />
          {children}
        </MantineEmotionProvider>
      </MantineProvider>
    </ReactQueryProvider>
  );
}
