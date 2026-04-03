
const { handleOptions, handleResendLogsToWhatsApp } = require("../../lib/backend");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    handleOptions(req, res);
    return;
  }

  await handleResendLogsToWhatsApp(req, res);
};
