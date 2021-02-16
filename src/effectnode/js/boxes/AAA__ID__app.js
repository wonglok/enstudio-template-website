/*
BoxScripts[box.moduleName].box({
  resources,
  domElement: mounter,
  pulse,
  inputAt,
  log: (v) => {
    console.log(JSON.stringify(v, null, 4));
  },
  graph: lowdb,
});
*/

import ReactDOM from "react-dom";
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

function MyRouter({ relay }) {
  const [rotues, setRoutes] = useState([]);

  useEffect(() => {
    relay.box.inputs.map((e, idx) => {
      return relay.stream(idx, ({ type, Component, href }) => {
        if (type === "page") {
          setRoutes((s) => [
            ...s,
            <Route key={idx + e._id} exact path={href}>
              <Component></Component>
            </Route>,
          ]);
        }
      });
    });
  });

  return (
    rotues.length > 0 && (
      <Router>
        <Switch>{rotues}</Switch>
      </Router>
    )
  );
}

export const box = ({ domElement, ...relay }) => {
  ReactDOM.render(<MyRouter relay={relay}></MyRouter>, domElement);
};
