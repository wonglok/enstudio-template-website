import { getDevelopmentSockets } from "../apis/socketapi";
import create from "zustand";

export const useSystem = create((set) => {
  return {
    geo: false,
    meta: false,

    init: () => {
      getDevelopmentSockets().then((sockets) => {
        set((state) => {
          return {
            ...state,
            ...sockets,
          };
        });
      });
    },
  };
});
