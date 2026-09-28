/*
  Persistência simples para GitHub Pages.
  A chave não é publicada no repositório: fica apenas na sessão do navegador.
*/
const GITHUB_SYNC = {
  owner: "hidrogest",
  repo: "cards",
  branch: "main",
  path: "data/celebra-data.json"
};

let githubToken = sessionStorage.getItem("celebra-github-token") || "";
let githubSha = "";
let syncTimer = null;
let syncInProgress = false;
const originalSave = save;
const originalRenderSettings = renderSettings;

function githubApiUrl() {
  return `https://api.github.com/repos/${GITHUB_SYNC.owner}/${GITHUB_SYNC.repo}/contents/${GITHUB_SYNC.path}`;
}

function githubHeaders() {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function encodeGithubContent(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

function decodeGithubContent(value) {
  const bytes = Uint8Array.from(atob(value.replace(/\n/g, "")), char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function syncSnapshot() {
  return { people: state.people, messages: state.messages, password: state.password || "" };
}

function updateSyncLabel(text) {
  const label = document.querySelector("#syncLabel");
  if (label) label.textContent = text;
}

async function loadFromGithub() {
  const response = await fetch(`${githubApiUrl()}?ref=${encodeURIComponent(GITHUB_SYNC.branch)}`, { headers: githubHeaders() });
  if (response.status === 404) {
    githubSha = "";
    return;
  }
  if (!response.ok) throw new Error("Não foi possível acessar a base compartilhada.");
  const file = await response.json();
  const remote = decodeGithubContent(file.content);
  if (!remote || !Array.isArray(remote.people)) throw new Error("A base compartilhada está em formato inválido.");
  state = { ...state, ...remote, messages: { ...state.messages, ...(remote.messages || {}) } };
  githubSha = file.sha || "";
  originalSave();
}

async function syncToGithub({ quiet = false } = {}) {
  if (!githubToken || syncInProgress) return;
  syncInProgress = true;
  updateSyncLabel("salvando alterações…");
  try {
    const response = await fetch(githubApiUrl(), {
      method: "PUT",
      headers: { ...githubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Atualiza dados do Celebra",
        content: encodeGithubContent(syncSnapshot()),
        branch: GITHUB_SYNC.branch,
        ...(githubSha ? { sha: githubSha } : {})
      })
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || "Não foi possível salvar no GitHub.");
    }
    const result = await response.json();
    githubSha = result.content?.sha || githubSha;
    updateSyncLabel("salvo no GitHub");
    if (!quiet) toast("Alterações salvas para todos os acessos");
  } catch (error) {
    updateSyncLabel("alteração local pendente");
    if (!quiet) toast(error.message || "Não foi possível sincronizar agora.");
  } finally {
    syncInProgress = false;
  }
}

function scheduleSync() {
  if (!githubToken) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncToGithub(), 500);
}

save = function () {
  originalSave();
  scheduleSync();
};

renderSettings = function () {
  originalRenderSettings();
  const grid = document.querySelector("#settingsView .settings-grid");
  if (!grid) return;
  const oldAccessCard = [...grid.children].find(item => item.textContent.includes("Senha local"));
  if (oldAccessCard) {
    oldAccessCard.innerHTML = `<p class="eyebrow">ACESSO</p><h2>Chave como senha</h2><p>A chave do GitHub é a senha deste painel. Ela não fica salva ao sair e permite gravar a mesma base para toda a equipe.</p><p class="notice">Ao trocar a chave no GitHub, basta sair daqui e entrar novamente com a nova.</p>`;
  }
  const card = document.createElement("section");
  card.className = "card settings-card";
  card.innerHTML = `<p class="eyebrow">BASE COMPARTILHADA</p><h2>GitHub conectado</h2><p>As alterações nesta tela ficam guardadas no arquivo compartilhado do painel. A chave de acesso não é salva ao sair.</p><div class="list-actions"><button class="primary-button" id="saveNow">Salvar agora</button><button class="quiet-button" id="refreshData">Atualizar base</button></div><p class="notice">Status: <strong id="githubStatus">${githubToken ? "pronto para salvar" : "entre com a chave para sincronizar"}</strong></p>`;
  grid.prepend(card);
  document.querySelector("#saveNow").onclick = () => syncToGithub();
  document.querySelector("#refreshData").onclick = async () => {
    try {
      await loadFromGithub();
      renderAll();
      toast("Base compartilhada atualizada");
    } catch (error) {
      toast(error.message || "Não foi possível atualizar agora.");
    }
  };
};

document.querySelector("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const key = document.querySelector("#password").value.trim();
  const error = document.querySelector("#loginError");
  if (!key) return;
  error.textContent = "Conectando à base compartilhada…";
  githubToken = key;
  try {
    const identity = await fetch("https://api.github.com/user", { headers: githubHeaders() });
    if (!identity.ok) throw new Error("Chave inválida ou sem permissão.");
    await loadFromGithub();
    sessionStorage.setItem("celebra-github-token", githubToken);
    document.querySelector("#loginDialog").close();
    document.querySelector("#app").hidden = false;
    renderAll();
    checkAlerts();
    updateSyncLabel("conectado ao GitHub");
  } catch (failure) {
    githubToken = "";
    sessionStorage.removeItem("celebra-github-token");
    error.textContent = failure.message || "Não foi possível entrar.";
  }
}, true);

document.querySelector("#signOut").onclick = () => {
  githubToken = "";
  githubSha = "";
  sessionStorage.removeItem("celebra-github-token");
  document.querySelector("#app").hidden = true;
  document.querySelector("#password").value = "";
  document.querySelector("#loginDialog").showModal();
};
