const low = require("lowdb");
const path = require("path");

const FileAsync = require("lowdb/adapters/FileAsync");

let makeLow = async ({ filename }) => {
  const filePath = path.join(__dirname, "../", `./database/${filename}.json`);
  const adapter = new FileAsync(filePath);
  const db = low(adapter);

  return db;
};

module.exports.getAllDatabases = async () => {
  return {
    GeoDB: await makeLow({ filename: "geo" }),
    MetaDB: await makeLow({ filename: "meta" }),
  };
};
