/* Shared A4 composition for the preview, print/PDF and high-resolution PNG. */
const MONTH_NAMES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const MONTH_SHORT = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
const MONTHLY_HERO = "assets/monthly-celebration.png";
const MONTHLY_LOGO = "assets/monthly-logo-original.png";
const MONTHLY_DEFAULT_MESSAGE = "Que seu novo ciclo seja cheio de bons momentos.";
let monthlySelection = new Date().getMonth();
let monthlyMessage = localStorage.getItem("hidrogest-monthly-message") || MONTHLY_DEFAULT_MESSAGE;
let monthlyObserver, monthlyBusy = false;

function monthlyPeople(month) {
  return state.people.filter(p => birthdayParts(p.birthday)?.m === month + 1)
    .sort((a,b) => birthdayParts(a.birthday).d - birthdayParts(b.birthday).d || a.name.localeCompare(b.name,"pt-BR"));
}
function monthlyPages(month) {
  const people = monthlyPeople(month), pages = [];
  for (let i = 0; i < people.length; i += 3) pages.push(people.slice(i,i + 3));
  return pages.length ? pages : [[]];
}
function monthlyFallback(person) {
  // Match IDs and names to avoid assigning another person's photo after an import.
  if (person.id === "p16" && /^luis felipe$/i.test(person.name.trim())) return "assets/monthly-luis.jpg";
  if (person.id === "p12" && /^gustavo henrique da silva queiroz$/i.test(person.name.trim())) return "assets/monthly-gustavo.jpg";
  return "";
}
function monthlyPhoto(person) { return person.photo ? asPhoto(person.photo) : monthlyFallback(person); }
function monthlyPositions(count) { return count === 1 ? [212] : count === 2 ? [124,315] : [36,212,388]; }
function monthlyTitle(month) { const name = MONTH_NAMES[month]; return name[0].toUpperCase() + name.slice(1); }
function monthlyPaperHtml(month,people,page,total) {
  const positions = monthlyPositions(people.length);
  return `<article class="monthly-paper" aria-label="Aniversariantes de ${esc(MONTH_NAMES[month])}, página ${page + 1}">
    <header class="monthly-brand"><span class="monthly-logo-window"><img src="${MONTHLY_LOGO}" alt="Hidrogest"></span><span>${esc(MONTH_NAMES[month].toUpperCase())} / ${new Date().getFullYear()}</span></header>
    <div class="monthly-hero-copy"><p class="monthly-overline">ANIVERSARIANTES DO MÊS</p><h2>${esc(monthlyTitle(month))}</h2><p class="monthly-hero-phrase">mais um<br>ano de você.</p><p class="monthly-intro">Cada história faz parte<br>da nossa. Hoje, a festa é sua.</p></div>
    <img class="monthly-celebration" src="${MONTHLY_HERO}" alt="Balões, presente e bolo nas cores da Hidrogest"><p class="monthly-happy-birthday">FELIZ ANIVERSÁRIO!</p>
    <section class="monthly-gallery"><h3>Neste mês, celebramos</h3>${people.map((person,i) => {
      const date = birthdayParts(person.birthday), photo = monthlyPhoto(person);
      return `<article class="monthly-person" style="left:${positions[i]}px"><div class="monthly-portrait"><span class="monthly-photo-placeholder" aria-label="Foto ainda não cadastrada"><b>${String(date.d).padStart(2,"0")}</b><small>DE ${MONTH_SHORT[month]}</small></span>${photo ? `<img src="${esc(photo)}" data-fallback="${esc(monthlyFallback(person))}" data-person="${esc(person.name)}" alt="${esc(person.name)}">` : ""}</div><p class="monthly-date"><b>${String(date.d).padStart(2,"0")}</b><span> / ${MONTH_SHORT[month]}</span></p><h4>${esc(person.name)}</h4></article>`;
    }).join("")}${!people.length ? '<p class="monthly-no-birthdays">Nenhum aniversário cadastrado neste mês.<br>Novas histórias para celebrar em breve.</p>' : ""}</section>
    <footer class="monthly-paper-footer"><p>${esc(monthlyMessage)}</p><span>Com carinho, time Hidrogest.</span>${total > 1 ? `<small>${page + 1} / ${total}</small>` : ""}</footer>
  </article>`;
}
function monthlySetStatus(message,error = false) {
  const element = document.querySelector("#monthlyStatus");
  if (element) { element.textContent = message; element.classList.toggle("is-error",error); }
}
function monthlyBindImages(container) {
  container.querySelectorAll("img[data-fallback]").forEach(img => img.addEventListener("error",() => {
    if (img.dataset.fallback && !img.dataset.fallbackTried) { img.dataset.fallbackTried = "1"; img.src = img.dataset.fallback; }
    else { img.hidden = true; monthlySetStatus(`A foto de ${img.dataset.person} não abriu. Confira o link no perfil; a data continua no mural.`,true); }
  }));
}
function monthlyResizePreviews() {
  document.querySelectorAll(".monthly-page-frame").forEach(frame => {
    const scale = Math.min(1,frame.clientWidth / 595);
    frame.style.height = `${842 * scale}px`;
    frame.querySelector(".monthly-paper").style.transform = `scale(${scale})`;
  });
}
function monthlyRefreshPreview() {
  const host = document.querySelector("#monthlyPreviewPages");
  if (!host) return;
  const pages = monthlyPages(monthlySelection), people = monthlyPeople(monthlySelection);
  host.innerHTML = pages.map((page,i) => `<div class="monthly-page-frame">${monthlyPaperHtml(monthlySelection,page,i,pages.length)}</div>`).join("");
  monthlyBindImages(host);
  document.querySelector("#monthlyCount").textContent = `${people.length} ${people.length === 1 ? "aniversariante" : "aniversariantes"} · ${pages.length} ${pages.length === 1 ? "página A4" : "páginas A4"}`;
  const missing = people.filter(p => !monthlyPhoto(p));
  monthlySetStatus(missing.length ? `${missing.map(p => p.name).join(", ")}: foto pendente. O mural destaca a data até a foto ser cadastrada.` : "Seu mural está pronto para imprimir ou baixar.");
  monthlyResizePreviews();
}
function renderMonthlyPrint() {
  const view = document.querySelector("#monthlyView");
  if (!view) return;
  monthlyObserver?.disconnect();
  view.innerHTML = `<div class="monthly-layout"><aside class="card monthly-controls"><p class="eyebrow">MURAL HIDROGEST</p><h2>Um mês para celebrar.</h2><p>Escolha o mês e personalize a mensagem. O mural usa as fotos e datas dos colaboradores cadastrados.</p><label for="monthlyMonth">Mês do mural<select id="monthlyMonth">${MONTH_NAMES.map((name,i) => `<option value="${i}" ${i === monthlySelection ? "selected" : ""}>${monthlyTitle(i)}</option>`).join("")}</select></label><label for="monthlyMessage">Mensagem do rodapé<textarea id="monthlyMessage" rows="3" maxlength="110">${esc(monthlyMessage)}</textarea></label><small>A mensagem fica salva neste aparelho.</small><div class="monthly-downloads"><button class="primary-button" id="printMonthly">Imprimir / salvar PDF</button><button class="quiet-button" id="downloadMonthlyPrint">Baixar PNG em alta resolução</button></div><p class="monthly-help">Formato A4 vertical. Na impressão, escolha A4 e ative “gráficos de fundo”. Para fotos do Drive, imprimir ou salvar PDF mantém a imagem como ela aparece na prévia.</p><p id="monthlyStatus" class="monthly-status" role="status" aria-live="polite"></p></aside><section class="monthly-preview-area" aria-label="Prévia do mural"><div class="monthly-preview-toolbar"><span>PRÉVIA PARA IMPRESSÃO</span><small id="monthlyCount"></small></div><div id="monthlyPreviewPages"></div></section></div>`;
  document.querySelector("#monthlyMonth").onchange = event => { monthlySelection = +event.target.value; monthlyRefreshPreview(); };
  document.querySelector("#monthlyMessage").oninput = event => { monthlyMessage = event.target.value; localStorage.setItem("hidrogest-monthly-message",monthlyMessage); monthlyRefreshPreview(); };
  document.querySelector("#printMonthly").onclick = printMonthly;
  document.querySelector("#downloadMonthlyPrint").onclick = () => downloadMonthlyPrint(monthlySelection);
  monthlyObserver = new ResizeObserver(monthlyResizePreviews);
  monthlyObserver.observe(document.querySelector(".monthly-preview-area"));
  monthlyRefreshPreview();
}

async function printMonthly() {
  // Open during the user's click, before async work, including on mobile browsers.
  const printWindow = window.open("","_blank");
  if (!printWindow) return monthlySetStatus("Seu navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.",true);
  printWindow.document.write("<!doctype html><html lang='pt-BR'><head><title>Preparando mural Hidrogest</title></head><body><p>Preparando seu mural…</p></body></html>");
  try {
    const response = await fetch(new URL("monthly-print.css?v=celebration-4",document.baseURI));
    if (!response.ok) throw new Error("Não foi possível preparar os estilos de impressão.");
    const styles = await response.text(), pages = monthlyPages(monthlySelection);
    const fonts = [...document.querySelectorAll("link[rel='stylesheet']")].filter(link => link.href.includes("fonts.googleapis.com"));
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${esc(new URL(".",document.baseURI).href)}"><title>Aniversariantes de ${esc(monthlyTitle(monthlySelection))} — Hidrogest</title>${fonts.map(link => `<link rel="stylesheet" href="${esc(link.href)}">`).join("")}<style>${styles}</style></head><body class="monthly-print-document"><div class="monthly-print-toolbar"><button onclick="window.print()">Imprimir / salvar PDF</button><p>A4 vertical · sem margens · gráficos de fundo ativados</p></div>${pages.map((people,i) => `<div class="monthly-print-sheet">${monthlyPaperHtml(monthlySelection,people,i,pages.length)}</div>`).join("")}</body></html>`);
    printWindow.document.close();
    await Promise.all([...printWindow.document.images].map(img => new Promise(resolve => {
      if (img.complete && img.naturalWidth) return resolve();
      const finish = () => {
        clearTimeout(timer);
        // A completed failure or a timed-out request must not print a broken icon.
        if (!img.naturalWidth) img.hidden = true;
        img.onload = img.onerror = null;
        resolve();
      };
      const timer = setTimeout(finish,15000);
      img.onload = finish;
      img.onerror = () => {
        if (img.dataset.fallback && !img.dataset.fallbackTried) { img.dataset.fallbackTried = "1"; img.src = img.dataset.fallback; }
        else finish();
      };
      // The error event may have fired before these handlers were attached.
      if (img.complete && !img.naturalWidth) img.onerror();
    })));
    await printWindow.document.fonts.ready;
    monthlySetStatus("Mural aberto. Escolha sua impressora ou “Salvar como PDF”.");
    printWindow.focus(); printWindow.print();
  } catch (error) { monthlySetStatus(error.message || "Não foi possível abrir a impressão.",true); printWindow.close(); }
}

function monthlyLoadImage(source) {
  if (!source) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image(), timer = setTimeout(() => { img.onload = img.onerror = null; resolve(null); },15000);
    img.crossOrigin = "anonymous";
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = new URL(source,document.baseURI).href;
  });
}
async function monthlyExportPhoto(person) {
  const source = monthlyPhoto(person);
  if (!source) return null;
  const urls = [source], id = driveFileId(person.photo), fallback = monthlyFallback(person);
  if (id) urls.push(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`,`https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1600`);
  if (fallback && !urls.includes(fallback)) urls.push(fallback);
  for (const url of urls) { const img = await monthlyLoadImage(url); if (img) return img; }
  throw new Error(`A foto de ${person.name} não está disponível para PNG. Use “Imprimir / salvar PDF” para preservar as fotos do mural.`);
}
function monthlyCanvasLines(ctx,text,width) {
  const lines = []; let line = "";
  String(text).trim().split(/\s+/).forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > width) { lines.push(line); line = word; } else line = candidate;
  });
  if (line) lines.push(line); return lines;
}
function monthlyArch(ctx,x,y,width,height) {
  const r = width / 2;
  ctx.beginPath(); ctx.moveTo(x,y + height); ctx.lineTo(x,y + r); ctx.arc(x + r,y + r,r,Math.PI,0); ctx.lineTo(x + width,y + height); ctx.closePath();
}
function monthlyDrawCover(ctx,img,x,y,width,height) {
  const scale = Math.max(width / img.naturalWidth,height / img.naturalHeight), iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
  ctx.drawImage(img,x + (width - iw) / 2,y + (height - ih) * .36,iw,ih);
}
function monthlyDrawContained(ctx,img,x,y,width,height) {
  const scale = Math.min(width / img.naturalWidth,height / img.naturalHeight), iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
  ctx.drawImage(img,x + (width - iw) / 2,y + (height - ih) / 2,iw,ih);
}
async function monthlyCanvas(month,people,index,total,assets) {
  const canvas = document.createElement("canvas"); canvas.width = 2480; canvas.height = 3508;
  const ctx = canvas.getContext("2d"); ctx.scale(2480 / 595,3508 / 842);
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,595,842); ctx.fillStyle = "#153D56"; ctx.fillRect(0,425,595,417);
  // Crop only the official logo's transparent padding, keeping its true aspect ratio.
  ctx.drawImage(assets.logo,74,415,932,250,36,33.5,130,130 * 250 / 932);
  ctx.fillStyle = "#153D56"; ctx.font = '600 7.2px "DM Sans",Arial,sans-serif'; ctx.textAlign = "right"; ctx.fillText(`${MONTH_NAMES[month].toUpperCase()} / ${new Date().getFullYear()}`,559,49); ctx.textAlign = "left";
  ctx.font = '700 9px "DM Sans",Arial,sans-serif'; ctx.fillText("ANIVERSARIANTES DO MÊS",36,133);
  ctx.font = '400 60px "DM Serif Display",Georgia,serif'; ctx.fillText(monthlyTitle(month),34,197);
  ctx.font = 'italic 400 31px "DM Serif Display",Georgia,serif'; ctx.fillText("mais um",36,247); ctx.fillText("ano de você.",36,280);
  ctx.font = '400 11px "DM Sans",Arial,sans-serif'; ctx.fillText("Cada história faz parte",36,328); ctx.fillText("da nossa. Hoje, a festa é sua.",36,345);
  monthlyDrawContained(ctx,assets.hero,311,91,222,333);
  ctx.font = '700 9px "DM Sans",Arial,sans-serif'; ctx.fillText("FELIZ ANIVERSÁRIO!",36,402);
  ctx.fillStyle = "#fff"; ctx.font = '400 23.5px "DM Serif Display",Georgia,serif'; ctx.fillText("Neste mês, celebramos",36,479);
  const positions = monthlyPositions(people.length);
  for (let i = 0; i < people.length; i++) {
    const person = people[i], photo = assets.photos.get(person.id), x = positions[i], day = String(birthdayParts(person.birthday).d).padStart(2,"0");
    ctx.save(); monthlyArch(ctx,x,510,156,180); ctx.clip();
    if (photo) monthlyDrawCover(ctx,photo,x,510,156,180);
    else {
      ctx.fillStyle = "#55BBDF"; ctx.fillRect(x,510,156,180); ctx.fillStyle = "#153D56"; ctx.font = '400 58px "DM Serif Display",Georgia,serif'; ctx.textAlign = "center"; ctx.fillText(day,x + 78,622); ctx.font = '700 10px "DM Sans",Arial,sans-serif'; ctx.fillText(`DE ${MONTH_SHORT[month]}`,x + 78,647);
    }
    ctx.restore(); ctx.textAlign = "left"; ctx.fillStyle = "#55BBDF"; ctx.font = '400 29px "DM Serif Display",Georgia,serif'; ctx.fillText(day,x,724);
    const dayWidth = ctx.measureText(day).width; ctx.font = '700 10px "DM Sans",Arial,sans-serif'; ctx.fillText(` / ${MONTH_SHORT[month]}`,x + dayWidth,721);
    ctx.fillStyle = "#fff"; ctx.font = '500 13px "DM Sans",Arial,sans-serif'; monthlyCanvasLines(ctx,person.name,156).forEach((line,n) => ctx.fillText(line,x,748 + n * 16));
  }
  if (!people.length) { ctx.fillStyle = "#fff"; ctx.font = '400 16px "DM Sans",Arial,sans-serif'; ctx.fillText("Nenhum aniversário cadastrado neste mês.",36,578); ctx.fillText("Novas histórias para celebrar em breve.",36,604); }
  ctx.fillStyle = "#fff"; ctx.font = '400 10px "DM Sans",Arial,sans-serif'; monthlyCanvasLines(ctx,monthlyMessage,485).slice(0,2).forEach((line,i) => ctx.fillText(line,36,800 + i * 12));
  ctx.fillStyle = "#55BBDF"; ctx.font = '500 9px "DM Sans",Arial,sans-serif'; ctx.fillText("Com carinho, time Hidrogest.",36,826);
  if (total > 1) { ctx.textAlign = "right"; ctx.fillText(`${index + 1} / ${total}`,559,826); }
  return new Promise((resolve,reject) => {
    try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível preparar o PNG.")),"image/png"); }
    catch { reject(new Error("Uma foto externa bloqueou o PNG. Use “Imprimir / salvar PDF” para manter o mural completo.")); }
  });
}
async function downloadMonthlyPrint(month) {
  if (monthlyBusy) return;
  monthlyBusy = true;
  const button = document.querySelector("#downloadMonthlyPrint"), label = button?.textContent;
  if (button) { button.disabled = true; button.textContent = "Preparando seu mural…"; }
  monthlySetStatus("Carregando fotos e preparando o PNG em alta resolução…");
  try {
    await document.fonts.ready;
    const pages = monthlyPages(month), people = monthlyPeople(month);
    const [hero,logo,photos] = await Promise.all([monthlyLoadImage(MONTHLY_HERO),monthlyLoadImage(MONTHLY_LOGO),Promise.all(people.map(async p => [p.id,await monthlyExportPhoto(p)]))]);
    if (!hero || !logo) throw new Error("Os elementos do mural ainda não carregaram. Atualize a página e tente novamente.");
    const assets = {hero,logo,photos:new Map(photos)};
    // Prepare all pages before downloading: a failed photo never creates a blank PNG.
    const blobs = await Promise.all(pages.map((page,i) => monthlyCanvas(month,page,i,pages.length,assets)));
    blobs.forEach((blob,i) => {
      const anchor = document.createElement("a"), url = URL.createObjectURL(blob);
      anchor.href = url; anchor.download = `aniversariantes-${MONTH_NAMES[month]}-hidrogest${pages.length > 1 ? `-${i + 1}` : ""}.png`;
      document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url),30000);
    });
    monthlySetStatus(`${pages.length === 1 ? "Mural baixado" : `${pages.length} páginas preparadas`}: PNG A4 em alta resolução.${pages.length > 1 ? " Seu navegador pode pedir permissão para baixar vários arquivos." : ""}`);
  } catch (error) { monthlySetStatus(error.message || "Não foi possível gerar o mural. Tente imprimir ou salvar PDF.",true); }
  finally { monthlyBusy = false; if (button) { button.disabled = false; button.textContent = label; } }
}
const renderBeforeMonthly = renderAll;
renderAll = function () { renderBeforeMonthly(); renderMonthlyPrint(); };
const viewBeforeMonthly = selectView;
selectView = function (view) { viewBeforeMonthly(view); if (view === "monthly") { document.querySelector("#viewTitle").textContent = "Mural de aniversariantes"; renderMonthlyPrint(); } };
