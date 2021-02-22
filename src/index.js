import React from "react";
import ReactDOM from "react-dom";
import { EffectNode } from "./effectnode/app/core.js";
import { dev } from "./effectnode/effectnode.config";
import reportWebVitals from "./reportWebVitals";

let loadEffectNode = () => {
  require("./App.css");
  EffectNode({ domElement: document.getElementById("root") });
  reportWebVitals();
};

if (process.env.NODE_ENV === "development") {
  if (window.location.pathname === dev.publicPath) {
    let DevApp = require("./effectnode/devtools/DevApp").DevApp;
    ReactDOM.render(
      <React.StrictMode>
        <DevApp />
      </React.StrictMode>,
      document.getElementById("root")
    );
  } else {
    loadEffectNode();
  }
} else {
  loadEffectNode();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);
