(function () {
  const ENDPOINT = "https://now-playing-api.vercel.app/api/obsession"; // Link devuelto del proyecto de Vercel
  const POLL_MS = 60 * 60 * 1000; // cada 60 minutos // cada cuanto tiempo se consulta el endpoint (10s)

  const el = {};
  let localProgress = 0;
  let durationMs = 0;
  let tickTimer = null;

  function mount() {
    el.root = document.getElementById("now-playing");
    if (!el.root) {
      console.warn('No se encontró #now-playing en el HTML.');
      return false;
    }
    el.root.innerHTML = `
      <div class="np-card" data-state="loading">
        <img class="np-art" alt="" />
        <div class="np-info">
          <p class="np-title">Cargando…</p>
          <p class="np-artist"></p>
          <div class="np-bar"><div class="np-bar-fill"></div></div>
        </div>
        <span class="np-badge"></span>
      </div>
    `;
    el.card = el.root.querySelector(".np-card");
    el.art = el.root.querySelector(".np-art");
    el.title = el.root.querySelector(".np-title");
    el.artist = el.root.querySelector(".np-artist");
    el.bar = el.root.querySelector(".np-bar");
    el.barFill = el.root.querySelector(".np-bar-fill");
    el.badge = el.root.querySelector(".np-badge");
    return true;
  }

  function updateBar() {
    if (!durationMs) {
      el.bar.style.visibility = "hidden";
      return;
    }
    el.bar.style.visibility = "visible";
    const pct = Math.min(100, (localProgress / durationMs) * 100);
    el.barFill.style.width = pct + "%";
  }

  function render(data) {
    el.card.dataset.state = data.state;
    clearInterval(tickTimer);

    if (data.state === "error") {
      el.title.textContent = "No se pudo conectar con Spotify";
      el.artist.textContent = "";
      el.art.style.visibility = "hidden";
      el.badge.textContent = "";
      el.bar.style.visibility = "hidden";
      return;
    }

    if (data.state === "empty") {
      el.title.textContent = "Sin actividad reciente";
      el.artist.textContent = "";
      el.art.style.visibility = "hidden";
      el.badge.textContent = "";
      el.bar.style.visibility = "hidden";
      return;
    }

    const t = data.track;
    el.art.src = t.albumArt || "";
    el.art.style.visibility = t.albumArt ? "visible" : "hidden";
    el.title.textContent = t.title;
    el.artist.textContent = t.artist;

    durationMs = t.durationMs || 0;
    localProgress = data.progressMs || 0;
    if (data.state === "obsession") durationMs = 0; // sin barra de progreso


    if (data.state === "playing") {
      el.badge.textContent = "● En vivo";
    } else if (data.state === "paused") {
      el.badge.textContent = "❚❚ Pausado";
    } else if (data.state === "obsession") {
  el.badge.textContent = "♥ Obsesión de la semana";
    }else {
      el.badge.textContent = "Últ. escuchado";
    }
    

    updateBar();

    if (data.state === "playing") {
      // Interpola el progreso entre cada consulta para que la barra se vea fluida.
      tickTimer = setInterval(() => {
        localProgress += 1000;
        updateBar();
      }, 1000);
    }
  }

  async function poll() {
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      render(data);
    } catch (e) {
      render({ state: "error" });
    }
  }

  if (mount()) {
    poll();
    setInterval(poll, POLL_MS);
  }
})();
