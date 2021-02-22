import { createContext, useEffect } from "react";
import { GraphApp } from "../devtools/GraphApp";
import "./index.css";
import { useSystem } from "./store";

export const ProjectContext = createContext({});

export function DevApp() {
  let sys = useSystem((s) => s);

  useEffect(() => {
    sys.init();
  }, []);

  return (
    <div className="full">
      {sys.geo && (
        <ProjectContext.Provider value={sys}>
          <GraphApp></GraphApp>
        </ProjectContext.Provider>
      )}
    </div>
  );
}
