import { createRoot } from "react-dom/client";
import { App } from "./App";

function start() {
  // biome-ignore lint/style/noNonNullAssertion: We are sure the root element exists.
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
