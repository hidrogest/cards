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
  return [monthlyPeople(month)];
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
let monthlyMeasureContext;
function monthlyMeasure(text,size) {
  if (!monthlyMeasureContext && typeof document !== "undefined" && document.createElement) monthlyMeasureContext = document.createElement("canvas").getContext("2d");
  if (monthlyMeasureContext) { monthlyMeasureContext.font = `500 ${size}px "DM Sans",Arial,sans-serif`; return monthlyMeasureContext.measureText(text).width; }
  return String(text).length * size * .55;
}
function monthlyNameLines(text,width,size) {
  const lines = []; let line = "";
  for (const word of String(text).trim().split(/\s+/)) {
    // Also split an unusually long surname rather than dropping or clipping it.
    const pieces = []; let piece = "";
    for (const character of word) {
      if (piece && monthlyMeasure(piece + character,size) > width) { pieces.push(piece); piece = character; } else piece += character;
    }
    if (piece) pieces.push(piece);
    pieces.forEach((part,index) => {
      const candidate = line ? `${line}${index ? "" : " "}${part}` : part;
      if (line && monthlyMeasure(candidate,size) > width) { lines.push(line); line = part; } else line = candidate;
      if (index < pieces.length - 1 && line) { lines.push(line); line = ""; }
    });
  }
  if (line) lines.push(line);
  return lines;
}
function monthlyFitName(text,width,height,maxSize) {
  let size = maxSize, lines, lineHeight;
  do {
    lineHeight = size * 1.18;
    lines = monthlyNameLines(text,width,size);
    if (lines.length * lineHeight <= height + .01) break;
    size -= .2;
  } while (size > 3);
  return {size:+size.toFixed(2),lineHeight:+lineHeight.toFixed(2),lines};
}
function monthlyLayout(month,people) {
  const count = people.length, compact = count > 3, micro = count > 12;
  const layout = {
    width:595,height:842,mode:micro ? "micro" : compact ? "grid" : "portraits",
    galleryTop:compact ? 255 : 425, heading:{x:36,y:compact ? 278 : 455,size:compact ? 22 : 23.5,lineHeight:30},
    hero:compact ? {x:412,y:62,width:126,height:189} : {x:311,y:91,width:222,height:333},
    overline:{x:36,y:compact ? 102 : 125,size:9,lineHeight:12},
    title:{x:34,y:compact ? 120 : 147,size:compact ? 44 : 60,lineHeight:compact ? 48 : 60},
    phrase:{x:36,y:compact ? 174 : 228,size:compact ? 22 : 31,lineHeight:compact ? 27 : 33,lines:compact ? ["mais um ano de você."] : ["mais um","ano de você."]},
    intro:{x:36,y:compact ? 211 : 320,size:compact ? 10 : 11,lineHeight:17,lines:compact ? ["Cada história faz parte da nossa."] : ["Cada história faz parte","da nossa. Hoje, a festa é sua."]},
    happy:{x:36,y:compact ? 236 : 395,size:9,lineHeight:11},
    footer:{x:36,y:791,width:485,size:10,lineHeight:12},people:[]
  };
  if (micro) {
    // A shorter header gives large teams more readable names on the same sheet.
    layout.galleryTop=215;
    layout.heading={x:36,y:234,size:21,lineHeight:28};
    layout.hero={x:453,y:74,width:85,height:127.5};
    layout.overline={x:36,y:88,size:8.5,lineHeight:11};
    layout.title={x:34,y:104,size:36,lineHeight:40};
    layout.phrase={x:36,y:151,size:18,lineHeight:23,lines:["mais um ano de você."]};
    layout.intro={x:36,y:180,size:9,lineHeight:14,lines:["Cada história faz parte da nossa."]};
    layout.happy={x:36,y:200,size:8,lineHeight:10};
  }
  let cols, rows, cardWidth, rowHeight, startY, gapX;
  if (!compact) { cols = Math.max(1,count); rows = 1; cardWidth = 156; rowHeight = 270; startY = 510; gapX = 20; }
  else {
    cols = micro ? (count <= 20 ? 2 : count <= 36 ? 3 : 4) : (count <= 4 ? 2 : count <= 6 || count === 9 ? 3 : 4);
    rows = Math.ceil(count / cols); gapX = micro ? 18 : 16;
    cardWidth = (523 - (cols - 1) * gapX) / cols;
    startY = micro ? 274 : 327; rowHeight = (781 - startY) / rows;
  }
  people.forEach((person,index) => {
    const col = index % cols, row = Math.floor(index / cols), rowCount = Math.min(cols,count-row*cols);
    const rowOffset = compact && !micro ? (cols-rowCount)*(cardWidth+gapX)/2 : 0;
    const x = compact ? 36 + col * (cardWidth + gapX) + rowOffset : monthlyPositions(count)[index], y = startY + row * rowHeight;
    const day = String(birthdayParts(person.birthday).d).padStart(2,"0");
    const card = {person,day,x,y,width:cardWidth,height:rowHeight};
    if (micro) {
      const photoH = Math.min(48,rowHeight - 7), photoW = Math.min(42,photoH * .9), nameHeight = Math.max(12,rowHeight - 15), nameWidth = cardWidth - photoW - 10;
      card.photo = {x,y:y + 2,width:photoW,height:photoH};
      card.name = {x:x + photoW + 9,y:y + 1,width:nameWidth,height:nameHeight,...monthlyFitName(person.name,nameWidth,nameHeight,count > 36 ? 7.6 : count > 20 ? 9.2 : 10.5)};
      card.date = {x:card.name.x,y:y + rowHeight - 12,size:count > 36 ? 7.2 : 8.5,lineHeight:10,label:`${day} / ${MONTH_SHORT[month]}`};
      card.placeholderSize = Math.min(24,photoW * .55); card.placeholderMonth = false;
    } else {
      const nameHeight = compact ? Math.min(42,rowHeight * .28) : 48;
      const dateHeight = compact ? 27 : 35, photoH = compact ? Math.min(145,rowHeight - nameHeight - dateHeight - 16) : 180, photoW = compact ? Math.min(cardWidth,Math.max(photoH,70)) : 156;
      card.photo = {x:x + (cardWidth - photoW) / 2,y,width:photoW,height:photoH};
      card.date = {x,y:y + photoH + 9,size:compact ? (rows > 2 ? 19 : 24) : 29,lineHeight:dateHeight,label:day,monthSize:compact ? 8 : 10};
      card.name = {x,y:card.date.y + dateHeight + 3,width:cardWidth,height:nameHeight,...monthlyFitName(person.name,cardWidth,nameHeight,compact ? (cols > 3 ? 10.3 : rows > 2 ? 11 : 12) : 13)};
      card.placeholderSize = Math.min(58,photoH * .4); card.placeholderMonth = photoH > 65;
    }
    layout.people.push(card);
  });
  Object.assign(layout.footer,monthlyFitName(monthlyMessage,layout.footer.width,24,10));
  return layout;
}
function monthlyTextStyle(item) { return `left:${item.x}px;top:${item.y}px;font-size:${item.size}px;line-height:${item.lineHeight}px`; }
function monthlyPaperHtml(month,people) {
  const layout = monthlyLayout(month,people);
  return `<article class="monthly-paper monthly-${layout.mode}" style="--monthly-gallery-top:${layout.galleryTop}px" aria-label="Todos os aniversariantes de ${esc(MONTH_NAMES[month])} em uma página A4">
    <header class="monthly-brand"><span class="monthly-logo-window"><img src="${MONTHLY_LOGO}" alt="Hidrogest"></span><span>${esc(MONTH_NAMES[month].toUpperCase())} / ${new Date().getFullYear()}</span></header>
    <p class="monthly-overline monthly-positioned" style="${monthlyTextStyle(layout.overline)}">ANIVERSARIANTES DO MÊS</p><h2 class="monthly-positioned" style="${monthlyTextStyle(layout.title)}">${esc(monthlyTitle(month))}</h2>
    <p class="monthly-hero-phrase monthly-positioned" style="${monthlyTextStyle(layout.phrase)}">${layout.phrase.lines.map(esc).join("<br>")}</p><p class="monthly-intro monthly-positioned" style="${monthlyTextStyle(layout.intro)}">${layout.intro.lines.map(esc).join("<br>")}</p>
    <img class="monthly-celebration" style="left:${layout.hero.x}px;top:${layout.hero.y}px;width:${layout.hero.width}px;height:${layout.hero.height}px" src="${MONTHLY_HERO}" alt="Balões, presente e bolo nas cores da Hidrogest"><p class="monthly-happy-birthday monthly-positioned" style="${monthlyTextStyle(layout.happy)}">FELIZ ANIVERSÁRIO!</p>
    <h3 class="monthly-gallery-heading monthly-positioned" style="${monthlyTextStyle(layout.heading)}">Neste mês, celebramos</h3>
    <section class="monthly-people-sheet">${layout.people.map(card => {
      const person = card.person, photo = monthlyPhoto(person), p = card.photo;
      return `<article class="monthly-person" data-person-id="${esc(person.id)}" style="left:${card.x}px;top:${card.y}px;width:${card.width}px;height:${card.height}px"><div class="monthly-portrait" style="left:${p.x-card.x}px;top:${p.y-card.y}px;width:${p.width}px;height:${p.height}px;border-radius:${p.width/2}px ${p.width/2}px 0 0"><span class="monthly-photo-placeholder" style="font-size:${card.placeholderSize}px"><b>${card.day}</b>${card.placeholderMonth ? `<small>DE ${MONTH_SHORT[month]}</small>` : ""}</span>${photo ? `<img src="${esc(photo)}" data-fallback="${esc(monthlyFallback(person))}" data-person="${esc(person.name)}" alt="${esc(person.name)}">` : ""}</div><p class="monthly-date" style="${monthlyTextStyle({...card.date,x:card.date.x-card.x,y:card.date.y-card.y})}">${layout.mode === "micro" ? esc(card.date.label) : `<b>${card.day}</b><span style="font-size:${card.date.monthSize}px"> / ${MONTH_SHORT[month]}</span>`}</p><h4 style="${monthlyTextStyle({...card.name,x:card.name.x-card.x,y:card.name.y-card.y})};width:${card.name.width}px">${card.name.lines.map(line=>`<span>${esc(line)}</span>`).join("")}</h4></article>`;
    }).join("")}</section>
    ${!people.length ? `<p class="monthly-no-birthdays" style="top:${layout.galleryTop+136}px">Nenhum aniversário cadastrado neste mês.<br>Novas histórias para celebrar em breve.</p>` : ""}
    <footer class="monthly-paper-footer"><p style="font-size:${layout.footer.size}px;line-height:${layout.footer.lineHeight}px;height:24px">${layout.footer.lines.map(line=>`<span>${esc(line)}</span>`).join("")}</p><span>Com carinho, time Hidrogest.</span></footer>
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
  document.querySelector("#monthlyCount").textContent = `${people.length} ${people.length === 1 ? "aniversariante" : "aniversariantes"} · uma página A4`;
  const missing = people.filter(p => !monthlyPhoto(p));
  monthlySetStatus(missing.length ? `${missing.map(p => p.name).join(", ")}: foto pendente. O mural destaca a data até a foto ser cadastrada.` : "Seu mural está pronto para imprimir ou baixar.");
  monthlyResizePreviews();
}
function renderMonthlyPrint() {
  const view = document.querySelector("#monthlyView");
  if (!view) return;
  monthlyObserver?.disconnect();
  view.innerHTML = `<div class="monthly-layout"><aside class="card monthly-controls"><p class="eyebrow">MURAL HIDROGEST</p><h2>Um mês para celebrar.</h2><p>Escolha o mês e personalize a mensagem. Todos os aniversariantes ficam juntos em uma única folha, com fotos, datas e nomes completos.</p><label for="monthlyMonth">Mês do mural<select id="monthlyMonth">${MONTH_NAMES.map((name,i) => `<option value="${i}" ${i === monthlySelection ? "selected" : ""}>${monthlyTitle(i)}</option>`).join("")}</select></label><label for="monthlyMessage">Mensagem do rodapé<textarea id="monthlyMessage" rows="3" maxlength="110">${esc(monthlyMessage)}</textarea></label><small>A mensagem fica salva neste aparelho.</small><div class="monthly-downloads"><button class="primary-button" id="printMonthly">Imprimir / salvar PDF</button><button class="quiet-button" id="downloadMonthlyPrint">Baixar PNG em alta resolução</button></div><p class="monthly-help">Uma página A4 vertical para o mês inteiro. O layout se ajusta ao número de pessoas. Na impressão, escolha A4 e ative “gráficos de fundo”. Para fotos do Drive, imprimir ou salvar PDF mantém as imagens da prévia.</p><p id="monthlyStatus" class="monthly-status" role="status" aria-live="polite"></p></aside><section class="monthly-preview-area" aria-label="Prévia do mural"><div class="monthly-preview-toolbar"><span>PRÉVIA PARA IMPRESSÃO</span><small id="monthlyCount"></small></div><div id="monthlyPreviewPages"></div></section></div>`;
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
    const response = await fetch(new URL("monthly-print.css?v=single-page-5",document.baseURI));
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
  const layout = monthlyLayout(month,people);
  const canvas = document.createElement("canvas"); canvas.width = 2480; canvas.height = 3508;
  const ctx = canvas.getContext("2d"); ctx.scale(2480 / 595,3508 / 842);
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,595,842); ctx.fillStyle = "#153D56"; ctx.fillRect(0,layout.galleryTop,595,842-layout.galleryTop);
  // Crop only the official logo's transparent padding, keeping its true aspect ratio.
  ctx.drawImage(assets.logo,74,415,932,250,36,33.5,130,130 * 250 / 932);
  ctx.fillStyle = "#153D56"; ctx.font = '600 7.2px "DM Sans",Arial,sans-serif'; ctx.textAlign = "right"; ctx.fillText(`${MONTH_NAMES[month].toUpperCase()} / ${new Date().getFullYear()}`,559,49); ctx.textAlign = "left";
  const text = (item,lines,font,color="#153D56") => {
    ctx.fillStyle=color; ctx.font=font; ctx.textBaseline="top";
    lines.forEach((line,i)=>ctx.fillText(line,item.x,item.y+i*item.lineHeight));
  };
  text(layout.overline,["ANIVERSARIANTES DO MÊS"],`700 ${layout.overline.size}px "DM Sans",Arial,sans-serif`);
  text(layout.title,[monthlyTitle(month)],`400 ${layout.title.size}px "DM Serif Display",Georgia,serif`);
  text(layout.phrase,layout.phrase.lines,`italic 400 ${layout.phrase.size}px "DM Serif Display",Georgia,serif`);
  text(layout.intro,layout.intro.lines,`400 ${layout.intro.size}px "DM Sans",Arial,sans-serif`);
  monthlyDrawContained(ctx,assets.hero,layout.hero.x,layout.hero.y,layout.hero.width,layout.hero.height);
  text(layout.happy,["FELIZ ANIVERSÁRIO!"],`700 ${layout.happy.size}px "DM Sans",Arial,sans-serif`);
  text(layout.heading,["Neste mês, celebramos"],`400 ${layout.heading.size}px "DM Serif Display",Georgia,serif`,"#fff");
  for (const card of layout.people) {
    const photo = assets.photos.get(card.person.id), p=card.photo;
    ctx.save(); monthlyArch(ctx,p.x,p.y,p.width,p.height); ctx.clip();
    if (photo) monthlyDrawCover(ctx,photo,p.x,p.y,p.width,p.height);
    else {
      ctx.fillStyle="#55BBDF"; ctx.fillRect(p.x,p.y,p.width,p.height); ctx.fillStyle="#153D56"; ctx.textAlign="center";ctx.textBaseline="top";
      const monthSpace=card.placeholderMonth?22:0, top=p.y+(p.height-card.placeholderSize-monthSpace)/2;
      ctx.font=`400 ${card.placeholderSize}px "DM Serif Display",Georgia,serif`;ctx.fillText(card.day,p.x+p.width/2,top);
      if(card.placeholderMonth){ctx.font='700 10px "DM Sans",Arial,sans-serif';ctx.fillText(`DE ${MONTH_SHORT[month]}`,p.x+p.width/2,top+card.placeholderSize+12);}
    }
    ctx.restore();ctx.textAlign="left";
    if(layout.mode==="micro") text(card.date,[card.date.label],`700 ${card.date.size}px "DM Sans",Arial,sans-serif`,"#55BBDF");
    else {
      text(card.date,[card.day],`400 ${card.date.size}px "DM Serif Display",Georgia,serif`,"#55BBDF");
      const dayWidth=ctx.measureText(card.day).width;
      text({...card.date,x:card.date.x+dayWidth+4,y:card.date.y+card.date.size-card.date.monthSize},[` / ${MONTH_SHORT[month]}`],`700 ${card.date.monthSize}px "DM Sans",Arial,sans-serif`,"#55BBDF");
    }
    text(card.name,card.name.lines,`500 ${card.name.size}px "DM Sans",Arial,sans-serif`,"#fff");
    if(layout.mode==="micro"){ctx.strokeStyle="rgba(85,187,223,.2)";ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(card.x,card.y+card.height-3);ctx.lineTo(card.x+card.width,card.y+card.height-3);ctx.stroke();}
  }
  if(!people.length)text({x:36,y:layout.galleryTop+136,lineHeight:26},["Nenhum aniversário cadastrado neste mês.","Novas histórias para celebrar em breve."],'400 16px "DM Sans",Arial,sans-serif',"#fff");
  text(layout.footer,layout.footer.lines,`400 ${layout.footer.size}px "DM Sans",Arial,sans-serif`,"#fff");
  text({x:36,y:822,lineHeight:11},["Com carinho, time Hidrogest."],'500 9px "DM Sans",Arial,sans-serif',"#55BBDF");
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
    const people = monthlyPeople(month);
    const [hero,logo,photos] = await Promise.all([monthlyLoadImage(MONTHLY_HERO),monthlyLoadImage(MONTHLY_LOGO),Promise.all(people.map(async p => [p.id,await monthlyExportPhoto(p)]))]);
    if (!hero || !logo) throw new Error("Os elementos do mural ainda não carregaram. Atualize a página e tente novamente.");
    const assets = {hero,logo,photos:new Map(photos)};
    const blob = await monthlyCanvas(month,people,0,1,assets), anchor = document.createElement("a"), url = URL.createObjectURL(blob);
    anchor.href=url;anchor.download=`aniversariantes-${MONTH_NAMES[month]}-hidrogest.png`;
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    monthlySetStatus(`Mural baixado: todos os ${people.length} aniversariantes em uma página A4, em alta resolução.`);
  } catch (error) { monthlySetStatus(error.message || "Não foi possível gerar o mural. Tente imprimir ou salvar PDF.",true); }
  finally { monthlyBusy = false; if (button) { button.disabled = false; button.textContent = label; } }
}
const renderBeforeMonthly = renderAll;
renderAll = function () { renderBeforeMonthly(); renderMonthlyPrint(); };
const viewBeforeMonthly = selectView;
selectView = function (view) { viewBeforeMonthly(view); if (view === "monthly") { document.querySelector("#viewTitle").textContent = "Mural de aniversariantes"; renderMonthlyPrint(); } };
