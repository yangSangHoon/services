import { track } from "@lab/core/track";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "maplibre-gl/dist/maplibre-gl.css";
import "./classical.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

track("travel-map");
