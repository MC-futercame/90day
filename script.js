const totalDays = 90;
const plannerData = Array.from({ length: totalDays }, (_, index) => ({
  day: index + 1,
  tasks: []
}));

let currentDayIndex = 0;
let currentUser = null;
const DEFAULT_LOCAL_API_ORIGIN = "http://127.0.0.1:3000";

const loginScreen = document.getElementById("loginScreen");
const loginNumber = document.getElementById("loginNumber");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");
const currentDayLabel = document.getElementById("currentDayLabel");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const taskInput = document.getElementById("taskInput");
const statusMessage = document.getElementById("statusMessage");
const daysGrid = document.getElementById("daysGrid");
const insertBtn = document.getElementById("insertBtn");
const saveStayBtn = document.getElementById("saveStayBtn");
const exportBtn = document.getElementById("exportBtn");
const resetBtn = document.getElementById("resetBtn");
const currentUserName = document.getElementById("currentUserName");

function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (window.location.protocol === "file:") {
    return `${DEFAULT_LOCAL_API_ORIGIN}${normalizedPath}`;
  }

  return normalizedPath;
}

function normalizeNumber(value) {
  return value.replace(/\D/g, "");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setLoginStatus(message, tone = "neutral") {
  loginStatus.textContent = message;
  loginStatus.style.color =
    tone === "success" ? "#1f6f43" :
    tone === "warning" ? "#9f3f12" :
    "#5a6872";
}

function setStatus(message, tone = "neutral") {
  statusMessage.textContent = message;
  statusMessage.style.color =
    tone === "success" ? "#1f6f43" :
    tone === "warning" ? "#9f3f12" :
    "#5a6872";
}

async function loginUser() {
  const number = normalizeNumber(loginNumber.value);

  if (!number) {
    setLoginStatus("Entrez votre numero pour vous connecter.", "warning");
    return;
  }

  loginBtn.disabled = true;
  setLoginStatus("Verification en cours...", "neutral");

  try {
    const response = await fetch(getApiUrl("/api/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ number })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      setLoginStatus(result.message || "Numero non autorise.", "warning");
      return;
    }

    currentUser = {
      name: result.user.name,
      number: result.user.number
    };

    currentUserName.textContent = `${currentUser.name} (${currentUser.number})`;
    loginScreen.classList.add("hidden");
    setLoginStatus("");
    setStatus(`Bienvenue ${currentUser.name}. Vous pouvez maintenant creer votre plan sur 90 jours.`, "success");
    taskInput.focus();
  } catch (error) {
    const offlineMessage = window.location.protocol === "file:"
      ? "Connexion impossible au serveur. Lancez d'abord le serveur avec npm start puis ouvrez http://127.0.0.1:3000."
      : "Connexion impossible au serveur. Verifiez que le site est ouvert via http://127.0.0.1:3000 puis reessayez.";

    setLoginStatus(offlineMessage, "warning");
  } finally {
    loginBtn.disabled = false;
  }
}

function parseTasks(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getTaskSummary(tasks) {
  if (!tasks.length) {
    return "Aucune tache ajoutee pour le moment.";
  }

  return tasks.join("\n");
}

function saveCurrentDay() {
  plannerData[currentDayIndex].tasks = parseTasks(taskInput.value);
}

function renderHeader() {
  currentDayLabel.textContent = `Jour ${currentDayIndex + 1}`;
  progressText.textContent = `${currentDayIndex + 1} / ${totalDays}`;
  progressFill.style.width = `${((currentDayIndex + 1) / totalDays) * 100}%`;
}

function renderInput() {
  taskInput.value = plannerData[currentDayIndex].tasks.join("\n");
}

function renderDaysGrid() {
  daysGrid.innerHTML = "";

  plannerData.forEach((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `day-card${index === currentDayIndex ? " active" : ""}${item.tasks.length ? " complete" : ""}`;
    card.setAttribute("aria-label", `Ouvrir le jour ${item.day}`);
    card.innerHTML = `
      <h3>Jour ${item.day}</h3>
      <p class="day-meta">${item.tasks.length} ${item.tasks.length === 1 ? "tache" : "taches"}</p>
      <p class="day-preview">${escapeHtml(getTaskSummary(item.tasks))}</p>
    `;

    card.addEventListener("click", () => {
      saveCurrentDay();
      currentDayIndex = index;
      renderAll();
      setStatus(`Modification du jour ${item.day}.`, "neutral");
    });

    daysGrid.appendChild(card);
  });
}

function renderAll() {
  renderHeader();
  renderInput();
  renderDaysGrid();
}

function moveToNextDay() {
  if (currentDayIndex < totalDays - 1) {
    currentDayIndex += 1;
    renderAll();
    taskInput.focus();
    setStatus(`Enregistre. Continuez maintenant avec le jour ${currentDayIndex + 1}.`, "success");
  } else {
    renderAll();
    setStatus("Le jour 90 est enregistre. Vous pouvez maintenant exporter votre tableau Word.", "success");
  }
}

function buildWordTableDocument() {
  const userInfo = currentUser
    ? `<p><strong>Utilisateur :</strong> ${escapeHtml(currentUser.name)} (${escapeHtml(currentUser.number)})</p>`
    : "";

  const rows = plannerData.map((item) => {
    const taskMarkup = item.tasks.length
      ? `<ol>${item.tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ol>`
      : "<p>Aucune tache ajoutee.</p>";

    return `
      <tr>
        <td>Jour ${item.day}</td>
        <td>${taskMarkup}</td>
      </tr>
    `;
  }).join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Plan sur 90 jours</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #9f3f12; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; padding: 10px; vertical-align: top; }
          th { background: #f1d6c1; text-align: left; }
          ol { margin: 0; padding-left: 20px; }
          p { margin: 0; }
        </style>
      </head>
      <body>
        <h1>Plan intelligent de taches quotidiennes sur 90 jours</h1>
        ${userInfo}
        <table>
          <thead>
            <tr>
              <th style="width: 18%;">Jour</th>
              <th>Taches</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

function exportToWord() {
  saveCurrentDay();

  const documentContent = buildWordTableDocument();
  const blob = new Blob(["\ufeff", documentContent], {
    type: "application/msword"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plan-intelligent-90-jours.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setStatus("Le fichier Word a ete exporte. Le planning a ete reinitialise pour creer un nouveau plan sur 90 jours.", "success");
  resetPlanner(false);
}

function resetPlanner(showMessage = true) {
  plannerData.forEach((item) => {
    item.tasks = [];
  });

  currentDayIndex = 0;
  renderAll();
  taskInput.focus();

  if (showMessage) {
    setStatus("Le planning a ete reinitialise. Vous pouvez commencer un nouveau plan sur 90 jours.", "warning");
  }
}

insertBtn.addEventListener("click", () => {
  saveCurrentDay();
  moveToNextDay();
});

saveStayBtn.addEventListener("click", () => {
  saveCurrentDay();
  renderDaysGrid();
  setStatus(`Le jour ${currentDayIndex + 1} est enregistre. Vous pouvez continuer a modifier ou passer a un autre jour.`, "success");
});

exportBtn.addEventListener("click", exportToWord);
resetBtn.addEventListener("click", () => resetPlanner(true));
loginBtn.addEventListener("click", loginUser);

loginNumber.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loginUser();
  }
});

taskInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    saveCurrentDay();
    moveToNextDay();
  }
});

renderAll();
loginNumber.focus();
if (window.location.protocol === "file:") {
  setLoginStatus("Cette page doit etre ouverte via http://127.0.0.1:3000 apres avoir lance npm start.", "warning");
} else {
  setLoginStatus("Entrez votre numero pour vous connecter.", "neutral");
}
setStatus("Commencez a ecrire les taches du jour 1.", "neutral");
