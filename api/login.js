const { handleLogin, handleOptions } = require("../lib/backend");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    handleOptions(req, res);
    return;
  }

  await handleLogin(req, res);
};
