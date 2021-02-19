import { useEffect, useState } from "react";
import { getDevelopmentSockets } from "../apis/socketapi";
import { GraphApp } from "../devtools/GraphApp";

export function DevApp() {
  const [deps, setDeps] = useState(false);
  useEffect(() => {
    getDevelopmentSockets().then((res) => {
      setDeps(res);
    });
  });
  return (
    deps && (
      <div className="full">
        <GraphApp></GraphApp>
      </div>
    )
  );
}
