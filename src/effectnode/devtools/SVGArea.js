import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ProjectContext } from "./DevApp";

export function SVGArea() {
  let ref = useRef();

  let [rect, setRect] = useState(false);

  useEffect(() => {
    let rect = ref.current.getBoundingClientRect();
    setRect(rect);
  }, [!!rect]);

  useEffect(() => {
    let resizer = () => {
      let rect = ref.current.getBoundingClientRect();
      setRect(rect);
    };
    window.addEventListener("resize", resizer);
    return () => {
      window.removeEventListener("resize", resizer);
    };
  }, []);

  useLayoutEffect(() => {
    let rect = ref.current.getBoundingClientRect();
    setRect(rect);

    let relayout = ({ detail }) => {
      let rect = ref.current.getBoundingClientRect();
      setRect(rect);
    };
    window.addEventListener("relayout", relayout);
    return () => {
      window.removeEventListener("relayout", relayout);
    };
  }, []);

  return (
    <div ref={ref} className={"w-full h-full relative"}>
      {rect && <SVGEditor rect={rect}></SVGEditor>}
    </div>
  );
}

export function SVGEditor({ rect }) {
  // let { geo, meta } = useContext(ProjectContext);

  useEffect(() => {
    // console.log(geo, meta);
  }, []);

  return <svg>{rect.width}</svg>;
}
