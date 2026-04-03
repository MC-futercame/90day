const fsp = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOGIN_LOG_PATH = path.join(ROOT, "login-log.json");
const LOGIN_LOG_STORAGE_KEY = process.env.LOGIN_LOG_STORAGE_KEY || "login-log";

const allowedUsers = {
  "0696640278": "MOHA",
  "0718873531": "TECHER",
  "0704799051": "ZAKA",
  "0716053101": "YOUSS",
  "0606531430": "YOUSS2",
  "0634916276": "SONOFANARCH",
  "0705678855": "IMANE",
  "0625561123": "YASSIN",
  "071253247921": "AGRICOLE",
  "0702876825": "ABDRAHIM",
  "0780727479": "AITOMARE",
  "0708618615": "ADAM",
  "0703774065": "AYOUBE",
  "0654384669": "AWYAL",
  "0670369603": "REDA",
  "0651951157": "ABDSLAM",
  "0602853152": "AATARE",
  "0775602398": "LBHJA",
  "0713968552": "JADDOU",
  "0777265490": "JWD",
  "0617279518": "MOHAMED",
  "0643978490": "MUSTAPHA",
  "0629032766": "YASSINEEE",
  "0654816156": "ANASS",
  "0649852320": "BIDRO",
  "0655608515": "MOUAD"
};

function normalizeNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function getAllowedUserName(rawNumber) {
  const normalized = normalizeNumber(rawNumber);

  if (!normalized) {
    return null;
  }

  const candidates = new Set([normalized]);

  if (normalized.startsWith("212") && normalized.length > 3) {
    candidates.add(`0${normalized.slice(3)}`);
  }

  if (normalized.startsWith("0") && normalized.length > 1) {
    candidates.add(`212${normalized.slice(1)}`);
  }

  for (const candidate of candidates) {
    if (allowedUsers[candidate]) {
      return {
        name: allowedUsers[candidate],
        storedNumber: candidate,
        inputNumber: normalized
      };
    }
  }

  return null;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendPlainText(res, statusCode, message) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

function handleOptions(_req, res) {
  setCorsHeaders(res);
  res.statusCode = 204;
  res.end();
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_error) {
      return {};
    }
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function hasUpstashConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.error) {
    throw new Error(result.error || "upstash_request_failed");
  }

  return result.result;
}

async function readLocalLoginLog() {
  try {
    const raw = await fsp.readFile(LOGIN_LOG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeLocalLoginLog(logs) {
  await fsp.writeFile(LOGIN_LOG_PATH, JSON.stringify(logs, null, 2), "utf8");
}

async function readLoginLog() {
  if (hasUpstashConfig()) {
    const raw = await upstashCommand(["GET", LOGIN_LOG_STORAGE_KEY]);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  return readLocalLoginLog();
}

async function appendLoginLog(entry) {
  const current = await readLoginLog();
  current.push(entry);

  if (hasUpstashConfig()) {
    await upstashCommand(["SET", LOGIN_LOG_STORAGE_KEY, JSON.stringify(current)]);
    return {
      ok: true,
      storage: "upstash"
    };
  }

  try {
    await writeLocalLoginLog(current);
    return {
      ok: true,
      storage: "file"
    };
  } catch (error) {
    if (process.env.VERCEL && ["EROFS", "EACCES", "EPERM"].includes(error.code)) {
      return {
        ok: false,
        skipped: true,
        reason: "read_only_filesystem"
      };
    }

    throw error;
  }
}

async function sendWhatsAppTextMessage(body) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toNumber = process.env.WHATSAPP_TO || "212696640278";

  if (!accessToken || !phoneNumberId) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_whatsapp_env"
    };
  }

  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizeNumber(toNumber),
      type: "text",
      text: {
        preview_url: false,
        body
      }
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error && result.error.message ? result.error.message : "whatsapp_send_failed");
  }

  return {
    ok: true,
    result
  };
}

async function sendWhatsAppLoginName(name) {
  return sendWhatsAppTextMessage(name);
}

function formatLoginHistoryMessage(logs) {
  if (!logs.length) {
    return "Historique de connexion vide.";
  }

  const lines = logs.map((entry, index) => {
    const when = entry.loggedAt ? new Date(entry.loggedAt).toLocaleString("fr-MA") : "date inconnue";
    return `${index + 1}. ${entry.name} - ${entry.number} - ${when}`;
  });

  return `Historique des connexions (${logs.length})\n${lines.join("\n")}`;
}

async function handleLogin(req, res) {
  if (req.method && req.method !== "POST") {
    sendPlainText(res, 405, "Method not allowed");
    return;
  }

  try {
    const body = await readRequestBody(req);
    const matchedUser = getAllowedUserName(body.number);

    if (!matchedUser) {
      sendJson(res, 401, {
        ok: false,
        message: "Numero non autorise."
      });
      return;
    }

    const loginEntry = {
      name: matchedUser.name,
      number: matchedUser.storedNumber,
      loggedAt: new Date().toISOString()
    };

    const storage = await appendLoginLog(loginEntry);

    let whatsapp = { ok: false, skipped: true };
    try {
      whatsapp = await sendWhatsAppLoginName(matchedUser.name);
    } catch (error) {
      whatsapp = {
        ok: false,
        skipped: false,
        reason: error.message
      };
    }

    sendJson(res, 200, {
      ok: true,
      user: {
        name: matchedUser.name,
        number: matchedUser.storedNumber
      },
      storage,
      whatsapp
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "Erreur serveur."
    });
  }
}

async function handleLogs(req, res) {
  if (req.method && req.method !== "GET") {
    sendPlainText(res, 405, "Method not allowed");
    return;
  }

  try {
    const logs = await readLoginLog();
    sendJson(res, 200, {
      ok: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "Impossible de lire l'historique."
    });
  }
}

async function handleResendLogsToWhatsApp(req, res) {
  if (req.method && req.method !== "POST") {
    sendPlainText(res, 405, "Method not allowed");
    return;
  }

  try {
    const logs = await readLoginLog();
    const message = formatLoginHistoryMessage(logs);
    const whatsapp = await sendWhatsAppTextMessage(message);

    sendJson(res, 200, {
      ok: true,
      count: logs.length,
      whatsapp
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: error.message || "Impossible d'envoyer l'historique sur WhatsApp."
    });
  }
}

module.exports = {
  ROOT,
  allowedUsers,
  appendLoginLog,
  formatLoginHistoryMessage,
  handleLogin,
  handleLogs,
  handleOptions,
  handleResendLogsToWhatsApp,
  normalizeNumber,
  readLoginLog,
  sendJson,
  sendPlainText,
  setCorsHeaders
};
