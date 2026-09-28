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

let githubToken = localStorage.getItem("celebra-github-token") || "";
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

function accessLink() {
  return `${location.origin}${location.pathname}#access=${encodeURIComponent(githubToken)}`;
}

function accessCode(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return new URLSearchParams(url.hash.slice(1)).get("access") || url.searchParams.get("access") || text;
  } catch (_) {
    return text;
  }
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

async function enterWithGithubKey(key) {
  const error = document.querySelector("#loginError");
  key = accessCode(key);
  if (!key) return;
  error.textContent = "Conectando à base compartilhada…";
  githubToken = key;
  try {
    const identity = await fetch("https://api.github.com/user", { headers: githubHeaders() });
    if (!identity.ok) throw new Error("Chave inválida ou sem permissão.");
    await loadFromGithub();
    localStorage.setItem("celebra-github-token", githubToken);
    document.querySelector("#loginDialog").close();
    document.querySelector("#app").hidden = false;
    renderAll();
    checkAlerts();
    updateSyncLabel("conectado ao GitHub");
  } catch (failure) {
    githubToken = "";
    localStorage.removeItem("celebra-github-token");
    error.textContent = failure.message || "Não foi possível entrar.";
  }
}

function showAccessQr() {
  if (!githubToken) return toast("Entre com a chave antes de gerar o QR.");
  if (typeof QRCode === "undefined") return toast("Não foi possível carregar o gerador de QR agora.");
  document.querySelector("#accessQrDialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "accessQrDialog";
  dialog.className = "qr-dialog";
  dialog.innerHTML = `<div><p class="eyebrow">ACESSO RÁPIDO</p><h2>Abra no celular</h2><p>Aponte a câmera para este QR. O celular entra automaticamente e permanece conectado.</p><div id="accessQrCode" class="qr-code"></div><div class="list-actions"><button class="primary-button" id="copyAccessLink">Copiar link</button><button class="quiet-button" id="shareAccessLink">Compartilhar</button></div><p class="notice">Trate este QR como uma senha: quem escanear poderá editar a base.</p><button class="quiet-button" id="closeAccessQr">Fechar</button></div>`;
  document.body.append(dialog);
  new QRCode(dialog.querySelector("#accessQrCode"), { text: accessLink(), width: 250, height: 250, colorDark: "#17122e", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
  const share = async () => {
    const link = accessLink();
    try {
      if (navigator.share) await navigator.share({ title: "Celebra Hidrogest", text: "Acesse o painel Celebra", url: link });
      else { await navigator.clipboard.writeText(link); toast("Link de acesso copiado"); }
    } catch (_) { /* a pessoa pode cancelar o compartilhamento */ }
  };
  dialog.querySelector("#copyAccessLink").onclick = async () => {
    try { await navigator.clipboard.writeText(accessLink()); toast("Link de acesso copiado"); }
    catch (_) { toast("Não foi possível copiar. Use o QR acima."); }
  };
  dialog.querySelector("#shareAccessLink").onclick = share;
  dialog.querySelector("#closeAccessQr").onclick = () => dialog.close();
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
}

renderSettings = function () {
  originalRenderSettings();
  const grid = document.querySelector("#settingsView .settings-grid");
  if (!grid) return;
  const oldAccessCard = [...grid.children].find(item => item.textContent.includes("Senha local"));
  if (oldAccessCard) {
  oldAccessCard.innerHTML = `<p class="eyebrow">ACESSO</p><h2>Este aparelho está conectado</h2><p>O acesso permanece neste aparelho até você sair. Para adicionar um celular, use o QR de acesso ao lado.</p><p class="notice">Ao trocar o código de acesso, saia e entre novamente.</p>`;
  }
  const card = document.createElement("section");
  card.className = "card settings-card";
  card.innerHTML = `<p class="eyebrow">BASE COMPARTILHADA</p><h2>Tudo salvo para a equipe</h2><p>As alterações deste painel ficam na mesma base compartilhada. Para abrir o painel em um celular, use o QR — é só escanear uma vez.</p><div class="list-actions"><button class="primary-button" id="saveNow">Salvar agora</button><button class="quiet-button" id="refreshData">Atualizar base</button><button class="quiet-button" id="showAccessQr">Abrir QR para celular</button></div><p class="notice">Status: <strong id="githubStatus">${githubToken ? "pronto para salvar" : "entre para sincronizar"}</strong></p>`;
  grid.prepend(card);
  document.querySelector("#saveNow").onclick = () => syncToGithub();
  document.querySelector("#showAccessQr").onclick = showAccessQr;
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
  const key = accessCode(document.querySelector("#password").value);
  const error = document.querySelector("#loginError");
  if (!key) return;
  error.textContent = "Conectando à base compartilhada…";
  githubToken = key;
  try {
    const identity = await fetch("https://api.github.com/user", { headers: githubHeaders() });
    if (!identity.ok) throw new Error("Chave inválida ou sem permissão.");
    await loadFromGithub();
    localStorage.setItem("celebra-github-token", githubToken);
    document.querySelector("#loginDialog").close();
    document.querySelector("#app").hidden = false;
    renderAll();
    checkAlerts();
    updateSyncLabel("conectado ao GitHub");
  } catch (failure) {
    githubToken = "";
    localStorage.removeItem("celebra-github-token");
    error.textContent = failure.message || "Não foi possível entrar.";
  }
}, true);

document.querySelector("#signOut").onclick = () => {
  githubToken = "";
  githubSha = "";
  localStorage.removeItem("celebra-github-token");
  document.querySelector("#app").hidden = true;
  document.querySelector("#password").value = "";
  document.querySelector("#loginDialog").showModal();
};

const accessFromHash = new URLSearchParams(location.hash.slice(1)).get("access");
if (accessFromHash) {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  document.querySelector("#password").value = accessFromHash;
  enterWithGithubKey(accessFromHash);
} else if (githubToken) {
  enterWithGithubKey(githubToken);
}
