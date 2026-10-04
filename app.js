const STORAGE_KEY = "sjtu-campus-trail-v1";

const welcome = document.querySelector("#welcome");
const finale = document.querySelector("#finale");
const card = document.querySelector("#card");
const title = document.querySelector("#title");
const body = document.querySelector("#body");
let revealTimer = 0;
let finaleRun = 0;
let finaleTimers = [];

function clearFinaleTimers() {
  finaleTimers.forEach((id) => window.clearTimeout(id));
  finaleTimers = [];
  finaleRun += 1;
}

function after(ms, run, fn) {
  const id = window.setTimeout(() => {
    if (run !== finaleRun) return;
    fn();
  }, ms);
  finaleTimers.push(id);
}

function showWelcome() {
  finale.hidden = true;
  card.hidden = true;
  welcome.hidden = false;
  welcome.classList.remove("is-in");
  void welcome.offsetWidth;
  welcome.classList.add("is-in");
  welcome.focus();
}

welcome.addEventListener("click", () => {
  if (welcome.hidden || !puzzles.length) return;
  saveState({ started: true, index: 0 });
  render();
});

function cookiePath() {
  const path = location.pathname.replace(/[^/]*$/, "");
  return path || "/";
}

function readCookie() {
  const prefix = `${STORAGE_KEY}=`;
  const found = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

function writeCookie(raw) {
  const maxAge = 60 * 60 * 24 * 400;
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(raw)}; Max-Age=${maxAge}; Path=${cookiePath()}; SameSite=Lax`;
}

function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* WeChat may block storage in private webviews. */
  }
  document.cookie = `${STORAGE_KEY}=; Max-Age=0; Path=${cookiePath()}`;
}

function readRaw() {
  let fromLocal = null;
  try {
    fromLocal = localStorage.getItem(STORAGE_KEY);
  } catch {
    fromLocal = null;
  }
  const fromCookie = readCookie();
  const raw = fromLocal || fromCookie;
  if (!fromLocal && fromCookie) {
    try {
      localStorage.setItem(STORAGE_KEY, fromCookie);
    } catch {
      /* Keep the cookie copy. */
    }
  }
  return raw;
}

function loadState() {
  try {
    const data = JSON.parse(readRaw() || "null");
    if (!data || typeof data !== "object") return { started: false, index: 0 };
    const index = Number.isInteger(data.index) ? data.index : 0;
    return {
      started: Boolean(data.started),
      index: Math.max(0, Math.min(index, puzzles.length)),
      reveal: Boolean(data.reveal),
      celebrated: Boolean(data.celebrated),
    };
  } catch {
    return { started: false, index: 0 };
  }
}

function saveState(state) {
  const raw = JSON.stringify({
    started: Boolean(state.started),
    index: state.index,
    reveal: Boolean(state.reveal),
    celebrated: Boolean(state.celebrated),
  });
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* Cookie still keeps the progress. */
  }
  writeCookie(raw);
}

window.addEventListener("pagehide", () => {
  const raw = readRaw();
  if (raw) writeCookie(raw);
});

function norm(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, "").toLowerCase();
}

function renderReveal(state) {
  const puzzle = puzzles[state.index];
  title.textContent = "交大校园定向";
  body.replaceChildren();
  const line = document.createElement("p");
  line.className = "reveal";
  line.textContent = puzzle.reveal;
  body.append(line);
  void line.offsetWidth;
  if (puzzle.revealStays) line.classList.add("passage");
  line.classList.add("is-in");

  if (puzzle.revealStays) {
    if (state.index + 1 < puzzles.length) {
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "继续";
      next.addEventListener("click", () => {
        saveState({ started: true, index: state.index + 1 });
        render();
      });
      body.append(next);
    }
    return;
  }

  window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => {
    saveState({ started: true, index: state.index + 1 });
    render();
  }, 4200);
}

function layLetters(letters) {
  const glyphs = [...letters.querySelectorAll(".glyph")];
  const board = document.createElement("div");
  board.className = "letter-board";
  letters.replaceWith(board);
  glyphs.forEach((glyph) => board.append(glyph));

  const size = Number.parseFloat(getComputedStyle(glyphs[0]).fontSize) || 28;
  const room = Math.max(finale.clientWidth - 56, 220);
  const col = Math.min(size * 1.45, room / glyphs.length);
  const rowH = size * 1.85;
  const rows = [3, 4, 4];
  const boardW = Math.max(glyphs.length, 4) * col;
  const boardH = rows.length * rowH;
  board.style.width = `${boardW}px`;
  board.style.height = `${boardH}px`;

  const startY = (boardH - rowH) / 2;
  const startX = (boardW - glyphs.length * col) / 2;
  const slots = [7, 3, 0, 6, 9, 10, 4, 8, 5, 1, 2];
  const slotOf = [];
  slots.forEach((source, slot) => {
    slotOf[source] = slot;
  });

  function endPos(slot) {
    let rest = slot;
    let row = 0;
    while (rest >= rows[row]) {
      rest -= rows[row];
      row += 1;
    }
    const rowW = rows[row] * col;
    return {
      x: (boardW - rowW) / 2 + rest * col,
      y: row * rowH,
    };
  }

  glyphs.forEach((glyph, index) => {
    const end = endPos(slotOf[index]);
    glyph.classList.add("flying");
    glyph.dataset.slot = String(slotOf[index]);
    glyph.dataset.endX = `${end.x}px`;
    glyph.dataset.endY = `${end.y}px`;
    glyph.style.left = `${startX + index * col}px`;
    glyph.style.top = `${startY}px`;
  });
  return board;
}

function letterLine(source) {
  const line = document.createElement("p");
  line.className = "finale-letters";
  source.split(" ").forEach((ch, index, list) => {
    const glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.textContent = ch;
    line.append(glyph);
    if (index < list.length - 1) line.append(document.createTextNode(" "));
  });
  return line;
}

function showSettledFinale() {
  welcome.hidden = true;
  card.hidden = true;
  finale.hidden = false;
  finale.classList.remove("is-in");
  finale.classList.add("is-settled");
  finale.replaceChildren();
  const name = document.createElement("p");
  name.className = "finale-name";
  name.textContent = "孙笑童";
  const cheer = document.createElement("p");
  cheer.className = "finale-cheer";
  cheer.textContent = "祝贺完成任务！";
  finale.append(name, cheer);
}

function renderFinale(state) {
  if (state.celebrated) {
    showSettledFinale();
    return;
  }

  const run = finaleRun;
  welcome.hidden = true;
  card.hidden = true;
  finale.hidden = false;
  finale.classList.remove("is-in", "is-settled");
  finale.replaceChildren();

  ["恭喜你完成了交大校园探索", "不过，这些字母有什么含义呢？"].forEach((text) => {
    const line = document.createElement("p");
    line.className = "finale-line";
    line.textContent = text;
    finale.append(line);
  });

  const letters = letterLine("n n g u o o x s t i a");
  letters.classList.add("finale-line");
  finale.append(letters);

  const ask = document.createElement("p");
  ask.className = "finale-line finale-ask";
  const askText = document.createElement("span");
  askText.textContent = "揭开最后的答案吧！";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rearrange";
  button.textContent = "Rearrange";
  ask.append(askText, button);
  finale.append(ask);

  void finale.offsetWidth;
  finale.classList.add("is-in");

  button.addEventListener("click", () => {
    if (run !== finaleRun) return;
    button.disabled = true;
    finale.querySelectorAll(".finale-line").forEach((node) => {
      if (node !== letters) node.remove();
    });
    const board = layLetters(letters);
    board.querySelectorAll(".glyph").forEach((glyph) => glyph.classList.add("spinning"));

    after(5000, run, () => {
      const glyphs = [...board.querySelectorAll(".glyph")];
      glyphs.forEach((glyph) => glyph.classList.remove("spinning"));
      void board.offsetWidth;
      glyphs.forEach((glyph) => glyph.classList.add("settle"));
      glyphs.forEach((glyph) => {
        const slot = Number(glyph.dataset.slot);
        glyph.style.transitionDelay = `${slot * 220}ms`;
        glyph.style.left = glyph.dataset.endX;
        glyph.style.top = glyph.dataset.endY;
      });

      const arrive = (glyphs.length - 1) * 220 + 750;
      after(arrive + 2000, run, () => {
        board.classList.add("is-out");
        after(600, run, () => {
          board.remove();
          const name = document.createElement("p");
          name.className = "finale-name";
          name.textContent = "孙笑童";
          finale.append(name);
          void name.offsetWidth;
          name.classList.add("is-in");

          saveState({ started: true, index: puzzles.length, celebrated: true });
          after(2000, run, () => {
            const cheer = document.createElement("p");
            cheer.className = "finale-cheer";
            cheer.textContent = "祝贺完成任务！";
            finale.append(cheer);
            void cheer.offsetWidth;
            cheer.classList.add("is-in");
          });
        });
      });
    });
  });
}

function render() {
  window.clearTimeout(revealTimer);
  clearFinaleTimers();
  const state = loadState();
  card.classList.remove("shake");

  if (!state.started) {
    showWelcome();
    return;
  }

  welcome.hidden = true;

  if (state.reveal && puzzles[state.index]?.reveal) {
    finale.hidden = true;
    card.hidden = false;
    renderReveal(state);
    return;
  }

  if (state.index >= puzzles.length) {
    renderFinale(state);
    return;
  }

  finale.hidden = true;
  card.hidden = false;

  const puzzle = puzzles[state.index];
  title.textContent = "交大校园定向";
  body.replaceChildren();

  const station = document.createElement("div");
  station.className = "station";
  const here = document.createElement("strong");
  here.textContent = `第 ${state.index + 1} 站`;
  const total = document.createElement("span");
  total.textContent = `共 ${puzzles.length} 站`;
  station.append(here, total);

  const track = document.createElement("div");
  track.className = "track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuemin", "1");
  track.setAttribute("aria-valuemax", String(puzzles.length));
  track.setAttribute("aria-valuenow", String(state.index + 1));
  track.setAttribute("aria-label", `第 ${state.index + 1} 站，共 ${puzzles.length} 站`);
  const fill = document.createElement("div");
  fill.className = "track-fill";
  fill.style.width = `${((state.index + 1) / puzzles.length) * 100}%`;
  track.append(fill);

  const prompt = document.createElement("p");
  prompt.className = "prompt";
  prompt.textContent = puzzle.prompt;

  const form = document.createElement("form");
  const label = document.createElement("label");
  label.setAttribute("for", "answer");
  label.textContent = "答案";
  const input = document.createElement("input");
  input.id = "answer";
  input.name = "answer";
  input.type = "text";
  input.autocomplete = "off";
  input.enterKeyHint = "go";
  input.required = true;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "确认";
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");
  form.append(label, input, submit, feedback);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const given = norm(input.value);
    const ok = puzzle.answers.some((answer) => norm(answer) === given);
    if (!ok) {
      feedback.className = "feedback bad";
      feedback.textContent = "还不对，再看看周围。";
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
      input.focus();
      return;
    }
    if (puzzle.reveal) {
      saveState({ started: true, index: state.index, reveal: true });
      render();
      return;
    }
    feedback.className = "feedback good";
    feedback.textContent = "对了。";
    saveState({ started: true, index: state.index + 1 });
    window.setTimeout(() => render(), 450);
  });

  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "quiet";
  restart.textContent = "从头开始";
  restart.addEventListener("click", () => {
    clearStored();
    render();
  });

  const nodes = [station, track];
  if (puzzle.image) {
    const image = document.createElement("img");
    image.className = "clue";
    image.src = puzzle.image;
    image.alt = "这一站的现场照片";
    nodes.push(image);
  }
  nodes.push(prompt, form, restart);
  body.append(...nodes);
  input.focus();
}

render();
