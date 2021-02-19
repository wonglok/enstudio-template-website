const config = require("../effectnode.config");
const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const cors = require("cors");
const PORT = config.dev.port;
app.use(cors());

const getAllDatabases = require("./MetaDB").getAllDatabases;

getAllDatabases().then(({ MetaDB, GeoDB }) => {
  require("./socket").setupSocket({ io, MetaDB, GeoDB });

  app.get("/", (req, res) => {
    res.json({
      msg: "api ready",
    });
  });

  http.listen(PORT, () => {
    console.log("listening on *:" + PORT);
  });
});
