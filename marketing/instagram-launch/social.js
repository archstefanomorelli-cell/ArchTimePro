const params = new URLSearchParams(location.search);
const type = params.get("type") || "carousel";
const slide = Math.max(1, Math.min(7, Number(params.get("slide") || 1)));
const artboard = document.getElementById("artboard");

const brand = `
  <div class="brand">
    <img src="../../assets/icons/archtimepro-social-icon-20260913.svg" alt="">
    <div>Arch Time Pro<small>Controllo commesse</small></div>
  </div>`;

const carouselSlides = [
  {
    eyebrow: "Margini di commessa",
    title: `5 errori che <span>mangiano</span> il margine di una commessa`,
    body: `Non sempre servono più clienti. A volte serve capire <strong>dove il lavoro sta consumando il compenso.</strong>`,
    mark: "05",
    extra: ""
  },
  {
    eyebrow: "Errore 01",
    title: `Preventivare solo le ore <span>tecniche</span>`,
    body: `Riunioni, telefonate, coordinamento e revisioni sono lavoro. Se non entrano nel conto, il margine esiste soltanto nel preventivo.`,
    mark: "01",
    extra: `<div class="cost-strip"><div><small>Ore previste</small><strong>120 h</strong></div><div><small>Ore reali</small><strong>168 h</strong></div><div class="bad"><small>Scostamento</small><strong>+40%</strong></div></div>`
  },
  {
    eyebrow: "Errore 02",
    title: `Trattare ogni variante come una <span>piccola cortesia</span>`,
    body: `Una modifica da mezz'ora sembra irrilevante. Ripetuta venti volte diventa una fase di lavoro mai preventivata.`,
    mark: "02",
    extra: `<div class="closing-panel"><strong>Le piccole richieste si sommano.</strong><span>Registrale sulla commessa prima che diventino invisibili.</span></div>`
  },
  {
    eyebrow: "Errore 03",
    title: `Inserire le ore solo a <span>fine mese</span>`,
    body: `La memoria arrotonda e dimentica. Ore incomplete producono costi falsi e un margine che sembra migliore di quello reale.`,
    mark: "03",
    extra: `<div class="cost-strip"><div><small>Ogni giorno</small><strong>Dati utili</strong></div><div><small>A fine mese</small><strong>Stime</strong></div><div class="bad"><small>Risultato</small><strong>Margine incerto</strong></div></div>`
  },
  {
    eyebrow: "Errore 04",
    title: `Lasciare le spese <span>fuori</span> dalla commessa`,
    body: `Trasferte, consulenze, stampe e acquisti incidono sul risultato. Il compenso non va confrontato soltanto con il costo delle ore.`,
    mark: "04",
    extra: `<div class="closing-panel"><strong>Margine = compenso - tutti i costi</strong><span>Ore del team e spese vive devono parlare la stessa lingua.</span></div>`
  },
  {
    eyebrow: "Errore 05",
    title: `Controllare il margine soltanto a <span>lavoro finito</span>`,
    body: `A consuntivo puoi spiegare la perdita. Durante il progetto puoi ancora correggerla: carico, perimetro, tempi e prossima fattura.`,
    mark: "05",
    extra: `<div class="cost-strip"><div><small>Costi consumati</small><strong>58%</strong></div><div><small>Piano costi</small><strong>49%</strong></div><div class="bad"><small>Segnale</small><strong>Da verificare</strong></div></div>`
  },
  {
    eyebrow: "La regola utile",
    title: `Il margine non si recupera alla fine. Si <span>controlla mentre lavori.</span>`,
    body: `Arch Time Pro riunisce budget, ore, spese e avanzamento delle commesse in una lettura semplice per lo studio.`,
    mark: "ATP",
    extra: `<div class="closing-panel"><strong>Provalo per 15 giorni.</strong><span>archtimepro.it · Nessuna carta richiesta</span></div>`
  }
];

function renderCarousel() {
  const item = carouselSlides[slide - 1];
  artboard.className = "carousel";
  artboard.innerHTML = `
    <section class="carousel-slide">
      <header class="slide-top">${brand}<div class="slide-number">${String(slide).padStart(2,"0")} / 07</div></header>
      <div class="carousel-copy">
        <div class="index-mark">${item.mark}</div>
        <div class="eyebrow">${item.eyebrow}</div>
        <h${slide === 1 ? "1" : "2"}>${item.title}</h${slide === 1 ? "1" : "2"}>
        <p>${item.body}</p>
        ${item.extra}
      </div>
      <footer class="carousel-footer"><b>archtimepro.it</b><span class="swipe">${slide < 7 ? "Scorri" : "15 giorni gratis"}<i></i></span></footer>
    </section>`;
}

function renderReachReel() {
  artboard.className = "reel reel-reach";
  artboard.innerHTML = `
    <section class="reel-shell reach-shell" id="reachShell">
      ${brand}
      <span class="safe-label">Dati dimostrativi</span>
      <div class="reach-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
      <main class="reach-main">
        <div class="reach-kicker">Una commessa</div>
        <div class="reach-amount" id="reachAmount">20.000 €</div>
        <div class="reach-label" id="reachLabel">Il compenso sembra ottimo.</div>
        <div class="reach-costs">
          <div class="reach-cost cost-team"><span>Ore del team</span><b>− 5.600 €</b></div>
          <div class="reach-cost cost-consultants"><span>Consulenze</span><b>− 3.100 €</b></div>
          <div class="reach-cost cost-revisions"><span>Revisioni extra</span><b>− 4.200 €</b></div>
          <div class="reach-cost cost-hours"><span>Ore non previste</span><b>− 8.500 €</b></div>
        </div>
        <div class="reach-meter">
          <div><span>Costi assorbiti</span><strong id="reachRate">0%</strong></div>
          <div class="reach-meter-track"><i id="reachBar"></i><b></b></div>
        </div>
        <div class="reach-alert" id="reachAlert"><i></i><span>Tutto sembra sotto controllo.</span></div>
      </main>
      <div class="reach-question" id="reachQuestion">
        <span>Il problema?</span>
        <strong>Te ne accorgi<br>quando è troppo tardi.</strong>
      </div>
      <div class="reach-final" id="reachFinal">
        <div class="reach-final-mark"><span></span></div>
        <h1>Il margine non si scopre <em>alla fine.</em></h1>
        <p>Controllalo mentre lavori.</p>
        <div class="reach-signoff"><img src="../../assets/icons/archtimepro-social-icon-20260913.svg" alt=""><div><b>Arch Time Pro</b><span>archtimepro.it</span></div></div>
      </div>
      <div class="reel-progress"><span></span></div>
    </section>`;

  const shell = document.getElementById("reachShell");
  const amountNode = document.getElementById("reachAmount");
  const labelNode = document.getElementById("reachLabel");
  const rateNode = document.getElementById("reachRate");
  const barNode = document.getElementById("reachBar");
  const alertNode = document.getElementById("reachAlert");
  const questionNode = document.getElementById("reachQuestion");
  const finalNode = document.getElementById("reachFinal");
  const progress = shell.querySelector(".reel-progress");
  const start = performance.now() + 800;
  const euro = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
  const ease = (value) => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
  const segment = (elapsed, from, to, amount) => ease((elapsed - from) / (to - from)) * amount;
  progress.classList.add("playing");

  function tick(now) {
    const elapsed = now - start;
    const costs = segment(elapsed, 1050, 1750, 5600)
      + segment(elapsed, 1900, 2650, 3100)
      + segment(elapsed, 2800, 3650, 4200)
      + segment(elapsed, 3800, 5050, 8500);
    const margin = 20000 - costs;
    const rate = costs / 20000 * 100;

    if (elapsed >= 900) {
      labelNode.textContent = "Margine reale";
      amountNode.textContent = `${margin < 0 ? "− " : ""}${euro.format(Math.abs(margin))} €`;
    }
    rateNode.textContent = `${Math.round(rate)}%`;
    barNode.style.width = `${Math.min(rate, 100)}%`;
    shell.style.setProperty("--risk", Math.min(rate / 110, 1).toFixed(3));

    document.querySelector(".cost-team").classList.toggle("visible", elapsed >= 1050);
    document.querySelector(".cost-consultants").classList.toggle("visible", elapsed >= 1900);
    document.querySelector(".cost-revisions").classList.toggle("visible", elapsed >= 2800);
    document.querySelector(".cost-hours").classList.toggle("visible", elapsed >= 3800);

    if (rate > 100) {
      shell.classList.add("is-over");
      alertNode.querySelector("span").textContent = "Fuori budget";
    } else if (rate > 57) {
      shell.classList.add("is-warning");
      alertNode.querySelector("span").textContent = "Il margine sta sparendo.";
    }
    shell.classList.toggle("show-question", elapsed >= 5600);
    questionNode.classList.toggle("visible", elapsed >= 5900 && elapsed < 9900);
    shell.classList.toggle("show-final", elapsed >= 9900);
    finalNode.classList.toggle("visible", elapsed >= 10200);

    if (elapsed < 14200) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderReel() {
  artboard.className = "reel";
  artboard.innerHTML = `
    <section class="reel-shell reel-live">
      ${brand}
      <span class="safe-label">Dati dimostrativi</span>
      <header class="live-hook">
        <div class="eyebrow">Controllo in tempo reale</div>
        <h1>Questa commessa sembra redditizia. Poi entrano i <span>costi reali.</span></h1>
        <p>Segui budget, costi e margine per 15 secondi.</p>
      </header>
      <div class="live-stage">
        <div class="floating-event event-hours"><span>+</span><div><small>Nuovo costo · Ore del team</small><b>2.200 €</b></div></div>
        <div class="floating-event event-expense"><span>+</span><div><small>Nuovo costo · Consulenza strutture</small><b>900 €</b></div></div>
        <div class="floating-event event-review"><span>+</span><div><small>Nuovo costo · Revisioni e coordinamento</small><b>4.200 €</b></div></div>
        <div class="floating-event event-extra"><span>+</span><div><small>Nuovo costo · Ore extra non previste</small><b>8.500 €</b></div></div>
        <article class="live-project">
          <div class="live-project-head">
            <div><small>Commessa 04</small><h2>Ristrutturazione Centro</h2><p>Studio Demo · Milano</p></div>
            <span id="liveStatus" class="live-status">Allineato</span>
          </div>
          <div class="live-timer">
            <div class="live-timer-copy"><i></i><span>Progetto esecutivo</span></div>
            <div><small>Tempo registrato</small><strong id="liveTimer">63:20</strong></div>
          </div>
          <div class="live-kpis">
            <div><span>Budget</span><strong>20.000 €</strong><small>Compenso</small></div>
            <div class="is-cost"><span>Costi</span><strong id="liveCosts">5.600 €</strong><small id="liveCostDelta">28,0% del budget</small></div>
            <div class="is-margin"><span>Margine</span><strong id="liveMargin">14.400 €</strong><small id="liveMarginRate">72,0%</small></div>
          </div>
          <div class="live-bars">
            <div class="live-bar-row"><div><span>Costi consumati</span><strong id="liveCostRate">28%</strong></div><div class="live-track"><i id="liveCostBar"></i></div></div>
            <div class="live-bar-row"><div><span>Piano costi</span><strong>49%</strong></div><div class="live-track"><i class="plan" style="width:49%"></i><b style="left:49%"></b></div></div>
          </div>
          <div class="live-note" id="liveNote"><i></i><span>Il lavoro è coerente con il piano.</span></div>
        </article>
      </div>
      <div class="live-caption" id="liveCaption">
        <span>01</span><p>Il timer registra il lavoro.</p>
      </div>
      <div class="live-cta" id="liveCta">
        <div><strong>Accorgitene mentre puoi ancora intervenire.</strong><span>Arch Time Pro · 15 giorni gratis</span></div>
        <b>archtimepro.it</b>
      </div>
      <div class="reel-progress"><span></span></div>
    </section>`;

  const progress = document.querySelector(".reel-progress");
  const costsNode = document.getElementById("liveCosts");
  const marginNode = document.getElementById("liveMargin");
  const costDeltaNode = document.getElementById("liveCostDelta");
  const marginRateNode = document.getElementById("liveMarginRate");
  const costRateNode = document.getElementById("liveCostRate");
  const costBarNode = document.getElementById("liveCostBar");
  const timerNode = document.getElementById("liveTimer");
  const statusNode = document.getElementById("liveStatus");
  const noteNode = document.getElementById("liveNote");
  const captionNode = document.getElementById("liveCaption");
  const ctaNode = document.getElementById("liveCta");
  const start = performance.now();
  progress.classList.add("playing");
  const euro = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
  const captions = [
    [0, "01", "Il timer registra il lavoro."],
    [2500, "02", "Le ore aggiornano subito i costi."],
    [5000, "03", "Anche le spese entrano nella commessa."],
    [7500, "04", "Il progetto è da monitorare."],
    [10100, "05", "Il budget viene superato."],
    [12600, "06", "Il segnale arriva mentre puoi agire."]
  ];

  const ease = (value) => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
  const segment = (elapsed, from, to, amount) => ease((elapsed - from) / (to - from)) * amount;
  function tick(now) {
    const elapsed = now - start;
    const costs = 5600
      + segment(elapsed, 1900, 3900, 2200)
      + segment(elapsed, 4300, 6100, 900)
      + segment(elapsed, 6500, 8600, 4200)
      + segment(elapsed, 9200, 11600, 8500);
    const margin = 20000 - costs;
    const costRate = costs / 20000 * 100;
    const marginRate = margin / 20000 * 100;
    const minutes = Math.round(3800 + Math.max(0, elapsed - 1800) / 1000 * 8.15);
    costsNode.textContent = `${euro.format(costs)} €`;
    marginNode.textContent = `${euro.format(margin)} €`;
    costDeltaNode.textContent = `${costRate.toFixed(1).replace(".", ",")}% del budget`;
    marginRateNode.textContent = `${marginRate.toFixed(1).replace(".", ",")}%`;
    costRateNode.textContent = `${Math.round(costRate)}%`;
    costBarNode.style.width = `${Math.min(costRate, 100)}%`;
    timerNode.textContent = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

    document.querySelector(".event-hours").classList.toggle("visible", elapsed >= 1950 && elapsed < 4200);
    document.querySelector(".event-expense").classList.toggle("visible", elapsed >= 4350 && elapsed < 6400);
    document.querySelector(".event-review").classList.toggle("visible", elapsed >= 6550 && elapsed < 9000);
    document.querySelector(".event-extra").classList.toggle("visible", elapsed >= 9250 && elapsed < 12200);

    if (costRate > 100) {
      statusNode.textContent = "Fuori budget";
      statusNode.classList.add("danger");
      statusNode.classList.remove("warning");
      noteNode.classList.add("danger");
      noteNode.classList.remove("warning");
      noteNode.querySelector("span").textContent = `Budget superato di ${euro.format(Math.abs(margin))} €.`;
      costBarNode.classList.add("danger");
      costBarNode.classList.remove("warning");
      marginNode.parentElement.classList.add("loss");
    } else if (costRate > 57) {
      statusNode.textContent = "Da monitorare";
      statusNode.classList.add("warning");
      noteNode.classList.add("warning");
      noteNode.querySelector("span").textContent = "I costi stanno avanzando più del piano.";
      costBarNode.classList.add("warning");
    }

    let caption = captions[0];
    captions.forEach((item) => { if (elapsed >= item[0]) caption = item; });
    captionNode.querySelector("span").textContent = caption[1];
    captionNode.querySelector("p").textContent = caption[2];
    ctaNode.classList.toggle("visible", elapsed >= 12600);
    if (elapsed < 15000) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

if (type === "reel-reach") renderReachReel();
else if (type === "reel") renderReel();
else renderCarousel();
