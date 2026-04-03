const { handleLogs, handleOptions } = require("../lib/backend");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    handleOptions(req, res);
    return;
  }

  await handleLogs(req, res);
};
