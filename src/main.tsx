import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import App from "./App.tsx";
import "./styles.css";

gsap.registerPlugin(useGSAP);


const root = document.getElementById("root");
if (!root) throw new Error("#root introuvable");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
