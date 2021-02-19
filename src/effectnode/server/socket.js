let fs = require("fs-extra");
let path = require("path");
let _ = require("lodash");
const { BINARY_OUTPUT, BOXES_FOLDER } = require("../effectnode.config");
module.exports.setupSocket = ({ io, MetaDB, GeoDB }) => {
  let makeSocket = (name, lowDB, customCallback = () => {}) => {
    let zone = io.of("/" + name);
    zone.on("connection", (socket) => {
      console.log("a user connected", socket.id, name);

      socket.on("disconnect", () => {
        console.log("a user disconneted", socket.id, name);
      });

      socket.on("read-ram", async () => {
        socket.emit("read-ram", {
          state: lowDB.getState(),
        });
      });

      socket.on("read-disk", async () => {
        await lowDB.read();
        socket.emit("read-disk", {
          state: lowDB.getState(),
        });
      });

      let tellOthers = () => {
        zone.emit("state-update", {
          state: lowDB.getState(),
        });
      };

      socket.on("write-ram", ({ state }, done) => {
        lowDB.setState(state);
        tellOthers();
        if (done) {
          done();
        }
      });

      let writeToDisk = ({ done }) => {
        lowDB.write().then(() => {
          if (done) {
            done();
          }
        });
      };
      let debouncedWrite = _.debounce(({ done }) => {
        writeToDisk({ done });
      }, 5000);

      socket.on("write-disk-debounced", ({ state }, done) => {
        lowDB.setState(state);
        tellOthers();
        debouncedWrite({ done });
      });

      socket.on("write-disk-now", ({ state }, done) => {
        lowDB.setState(state);
        tellOthers();
        writeToDisk({ done });
      });

      socket.on("list-folder", async (query, doneCallback = () => {}) => {
        let url = path.join(BINARY_OUTPUT);
        await fs.ensureDir(path.dirname(url));
        let res = await fs.readdir(url);
        doneCallback(res);
      });

      customCallback({ socket, io, name, lowDB });
    });
  };

  makeSocket("meta", MetaDB, ({ socket, io, name, lowDB }) => {
    socket.on(
      "overwrite-js",
      async ({ filename, data }, doneCallback = () => {}) => {
        if (filename && data) {
          let file = path.join(BOXES_FOLDER, filename);
          await fs.ensureDir(path.dirname(file));
          await fs.writeFile(file, data);
          doneCallback();
        }
      }
    );

    socket.on("remove-js", async ({ filename }, doneCallback = () => {}) => {
      if (filename) {
        let file = path.join(BOXES_FOLDER, filename);
        let hasFile = await fs.pathExists(file);
        if (hasFile) {
          await fs.ensureDir(path.dirname(file));
          await fs.remove(file);
          doneCallback();
        } else {
          console.log("dont have file");
        }
      }
    });
  });

  makeSocket("geo", GeoDB, ({ socket, io, name, lowDB }) => {
    socket.on(
      "overwrite-binary",
      async ({ filename, data }, doneCallback = () => {}) => {
        if (filename && data) {
          let file = path.join(BINARY_OUTPUT, filename);
          await fs.ensureDir(path.dirname(file));
          await fs.writeFile(file, data);
          doneCallback();
        }
      }
    );

    socket.on(
      "remove-binary",
      async ({ filename }, doneCallback = () => {}) => {
        if (filename) {
          let file = path.join(BINARY_OUTPUT, filename);
          let hasFile = await fs.pathExists(file);
          if (hasFile) {
            await fs.ensureDir(path.dirname(file));
            await fs.remove(file);
            doneCallback();
          } else {
            console.log("dont have file");
          }
        }
      }
    );
  });
};

//

//
