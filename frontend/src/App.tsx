import RoutesGlobal from "@/routes/index";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import Provider from "./components/layout/Provider";

function App() {
  return (
    <Provider>
      <RoutesGlobal />
    </Provider>
  );
}

export default App;
