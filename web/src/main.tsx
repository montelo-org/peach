import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { NewApp } from "./NewApp.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NewApp />
  </React.StrictMode>
);
