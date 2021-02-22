let path = require("path");
module.exports = {
  dev: {
    publicPath: "/_studio",
    port: 1234,
    apple: "wonglok.local:1234",
    localhost: "localhost:1234",
  },
  BINARY_OUTPUT: path.join(__dirname, "../../", "./public/effectnode/output"),
  BOXES_FOLDER: path.join(__dirname, "./boxes"),
};
