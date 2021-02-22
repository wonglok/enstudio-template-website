import io from "socket.io-client";
import config from "../effectnode.config";
const Cahce = new Map();

const makeSocketClient = async ({ host = config.dev.apple, nameID }) => {
  await fetch(`http://${host}/`, { mode: "no-cors" }).catch(() => {
    host = config.dev.localhost;
  });

  let socket = io(`ws://${host}/${nameID}`);

  Cahce.set(nameID, {
    socket,
  });
};

makeSocketClient({ nameID: "meta" });
makeSocketClient({ nameID: "geo" });

const getSocket = (nameID) => {
  return new Promise((resolve) => {
    let tt = setInterval(() => {
      if (Cahce.has(nameID)) {
        clearInterval(tt);
        resolve(Cahce.get(nameID));
      }
    });
  });
};

export const getDevelopmentSockets = async () => {
  return {
    meta: await getSocket("meta"),
    geo: await getSocket("geo"),
  };
};
