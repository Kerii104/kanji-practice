(() => {
// 1. Khởi tạo dữ liệu và cập nhật danh sách cũ khi cần
const key = "net-kanji-v1";
const kanshudoMigration = "net-kanji-kanshudo-n5n4-v1";
const n3Migration = "net-kanji-kanshudo-n3-v1";
const n2n1Migration = "net-kanji-kanshudo-n2n1-v1";

function createKanji([kanji, jlpt, han, meaning, reading]) {
  return {
    id: "kanshudo-" + kanji.codePointAt(0).toString(16),
    kanji,
    jlpt,
    han,
    meaning,
    reading,
    learned: false,
  };
}

// Không ghi đè bản lưu không đọc được: cho phép tải dữ liệu thô để khôi phục.
const rawSaved = localStorage.getItem(key);
let items;
try {
  items = rawSaved === null ? null : JSON.parse(rawSaved);
  if (rawSaved !== null && (!Array.isArray(items) || !items.every((item) => item && typeof item.id === "string" && typeof item.kanji === "string" && typeof item.han === "string" && typeof item.meaning === "string"))) throw new Error("Dữ liệu không đúng định dạng");
} catch {
  document.body.innerHTML = `<main style="margin:40px auto;padding:24px;max-width:600px;width:auto;font-family:sans-serif;line-height:1.7"><h1>Không thể đọc dữ liệu đã lưu</h1><p>Dữ liệu cũ chưa bị thay đổi. Hãy tải bản dữ liệu thô để giữ lại, sau đó liên hệ để được hỗ trợ khôi phục. Không xóa dữ liệu trình duyệt.</p><button id="downloadRecovery">Tải dữ liệu gốc</button></main>`;
  document.getElementById("downloadRecovery").onclick = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([rawSaved], {type:"application/json"}));
    link.download = "net-kanji-du-lieu-can-khoi-phuc.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  throw new Error("Dữ liệu đã lưu không hợp lệ; dừng để tránh ghi đè.");
}
if (!Array.isArray(items)) {
  // Trình duyệt mới: chỉ sử dụng một nguồn dữ liệu mặc định.
  items = kanshudoSeed.map(createKanji);
  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(kanshudoMigration, "1");
  localStorage.setItem(n3Migration, "1");
  localStorage.setItem(n2n1Migration, "1");
} else if (!localStorage.getItem(kanshudoMigration)) {
  // Dữ liệu cũ: chỉ bổ sung chữ còn thiếu và đồng bộ cấp độ một lần.
  // Không ghi đè nội dung tự sửa, ID hay tiến độ học.
  const byChar = new Map(items.map((item) => [item.kanji, item]));
  for (const row of kanshudoSeed.filter((row) => ["N5", "N4"].includes(row[1]))) {
    const existing = byChar.get(row[0]);
    if (existing) {
      existing.jlpt = row[1];
    } else {
      const entry = createKanji(row);
      items.push(entry);
      byChar.set(entry.kanji, entry);
    }
  }
  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(kanshudoMigration, "1");
}
// Thêm N3 một lần; không sửa hoặc khôi phục lại chữ người dùng đã có.
if (!localStorage.getItem(n3Migration)) {
  const existing = new Set(items.map((item) => item.kanji));
  for (const row of kanshudoSeed) {
    if (row[1] === "N3" && !existing.has(row[0])) {
      items.push(createKanji(row));
      existing.add(row[0]);
    }
  }
  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(n3Migration, "1");
}
// Điều chỉnh những mục mặc định đã được đối chiếu. Không ghi đè giá trị
// người dùng đã tự chỉnh sửa, không thay đổi ID, nghĩa hay tiến độ.
const readingsReviewKey = "net-kanji-readings-review-v1";
if (!localStorage.getItem(readingsReviewKey)) {
  const fixes = {
    "画": {old: "HOẠCH", corrected: "HỌA, HOẠCH"},
    "住": {old: "TRỤ", corrected: "TRÚ, TRỤ"},
    "両": {old: "LƯỢNG", corrected: "LƯỠNG, LƯỢNG"},
    "予": {old: "DƯ, DỮ", corrected: "DỰ, DƯ, DỮ"},
    "任": {old: "NHÂM, NHẬM", corrected: "NHIỆM, NHẬM, NHÂM"},
    "頂": {old: "ĐÍNH", corrected: "ĐỈNH, ĐÍNH"},
  };
  let changed = false;
  for (const item of items) {
    const fix = fixes[item.kanji];
    if (fix && item.han === fix.old) { item.han = fix.corrected; changed = true; }
  }
  if (changed) localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(readingsReviewKey, "1");
}
// Bỏ biến thể trùng lặp うま- của 馬 theo KANJIDIC2, chỉ khi còn nguyên mặc định.
const japaneseReadingReviewKey = "net-kanji-reading-ja-review-v1";
if (!localStorage.getItem(japaneseReadingReviewKey)) {
  const horse = items.find((item) => item.kanji === "馬");
  if (horse && horse.reading === "バ、うま、うま-、ま") {
    horse.reading = "バ、うま、ま";
    localStorage.setItem(key, JSON.stringify(items));
  }
  localStorage.setItem(japaneseReadingReviewKey, "1");
}
// 2. Trạng thái phiên học và các hàm tiện ích
let current = null;
let answerRevealed = false;
// Lịch sử chỉ tồn tại trong phiên; không làm thay đổi trạng thái đã học.
let practiceHistory = [];
const trashKey = "net-kanji-trash-v1";
let deletedItems;
const rawTrash = localStorage.getItem(trashKey);
try {
  deletedItems = rawTrash === null ? [] : JSON.parse(rawTrash);
  if (!Array.isArray(deletedItems) || !deletedItems.every(x => x && x.item && typeof x.item.id === "string" && typeof x.item.kanji === "string")) throw new Error();
} catch {
  document.body.innerHTML = `<main style="margin:40px auto;padding:24px;max-width:600px;width:auto;font-family:sans-serif;line-height:1.7"><h1>Không thể đọc danh sách đã xóa</h1><p>Dữ liệu chưa bị thay đổi. Hãy tải cả bản danh sách và dữ liệu đã xóa để được hỗ trợ khôi phục; không xóa dữ liệu trình duyệt.</p><button id="downloadRecovery">Tải dữ liệu gốc</button></main>`;
  document.getElementById("downloadRecovery").onclick = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify({itemsRaw: localStorage.getItem(key), trashRaw: rawTrash})], {type:"application/json"}));
    link.download = "net-kanji-du-lieu-can-khoi-phuc.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  throw new Error("Dữ liệu thùng rác không hợp lệ");
}
// Chỉ thêm N2/N1 một lần; giữ nguyên mọi chỉnh sửa và chữ đã xóa gần đây.
if (!localStorage.getItem(n2n1Migration)) {
  const existing = new Set(items.map((item) => item.kanji));
  for (const entry of deletedItems) existing.add(entry.item.kanji);
  for (const row of kanshudoSeed) {
    if ((row[1] === "N2" || row[1] === "N1") && !existing.has(row[0])) {
      items.push(createKanji(row));
      existing.add(row[0]);
    }
  }
  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(n2n1Migration, "1");
}
let savedItemsSnapshot = localStorage.getItem(key);
let savedTrashSnapshot = rawTrash;
let practiceMode = "learning";
let recentIds = [];
const $ = (id) => document.getElementById(id);
const appShell = document.querySelector(".app");
const sidebarToggle = $("sidebarToggle");
const sidebarToggleLabel = sidebarToggle.querySelector(".sidebar-toggle-label");
const sidebarPreferenceKey = "net-kanji-sidebar-collapsed-v1";

function setSidebarCollapsed(collapsed) {
  appShell.classList.toggle("sidebar-collapsed", collapsed);
  const label = collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên";
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute("aria-label", label);
  sidebarToggle.title = label;
  sidebarToggleLabel.textContent = label;
}

setSidebarCollapsed(localStorage.getItem(sidebarPreferenceKey) === "true");
sidebarToggle.addEventListener("click", () => {
  const collapsed = !appShell.classList.contains("sidebar-collapsed");
  setSidebarCollapsed(collapsed);
  localStorage.setItem(sidebarPreferenceKey, String(collapsed));
});

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function save() {
  if (localStorage.getItem(key) !== savedItemsSnapshot || localStorage.getItem(trashKey) !== savedTrashSnapshot) {
    alert("Dữ liệu đã thay đổi ở tab khác. Trang sẽ tải lại để tránh ghi đè; hãy thực hiện lại thao tác trên dữ liệu mới.");
    location.reload();
    throw new Error("Không lưu do dữ liệu đã thay đổi ở tab khác");
  }
  const nextItems = JSON.stringify(items);
  const nextTrash = JSON.stringify(deletedItems);
  try {
    // Lưu bản khôi phục trước khi xóa chữ khỏi danh sách.
    localStorage.setItem(trashKey, nextTrash);
    localStorage.setItem(key, nextItems);
  } catch (error) {
    try { if (savedTrashSnapshot === null) localStorage.removeItem(trashKey); else localStorage.setItem(trashKey, savedTrashSnapshot); } catch {}
    alert("Không thể lưu dữ liệu. Hãy xuất bản sao lưu và kiểm tra dung lượng hoặc quyền lưu trữ trình duyệt.");
    throw error;
  }
  savedItemsSnapshot = nextItems;
  savedTrashSnapshot = nextTrash;
}
document.getElementById("reloadData").onclick = () => location.reload();
window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === trashKey || event.key === null) {
    const banner = document.getElementById("storageConflict");
    if (banner) banner.classList.remove("hidden");
  }
});
function toast(s) {
  $("toast").textContent = s;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2500);
}
// Giao diện được lưu riêng, không ảnh hưởng dữ liệu học.
const themeKey = "net-kanji-theme-v1";
function setTheme(theme) {
  const safeTheme = ["green", "purple", "blue"].includes(theme) ? theme : "green";
  document.documentElement.dataset.theme = safeTheme;
  $("themeSelect").value = safeTheme;
  localStorage.setItem(themeKey, safeTheme);
}
setTheme(localStorage.getItem(themeKey));
$("themeSelect").addEventListener("change", (event) => setTheme(event.target.value));

// 3. Chọn chữ ngẫu nhiên và hiển thị thẻ luyện tập
const levelInputs = [...document.querySelectorAll("#levelFilter input[value]")];
const levelPreferenceKey = "net-kanji-levels-v1";
const hardPreferenceKey = "net-kanji-hard-mode-v1";
let hardMode = localStorage.getItem(hardPreferenceKey) === "true";
const isHardLevel = (input) => input.value === "N2" || input.value === "N1";
const availableLevels = () => levelInputs.filter((input) => hardMode || !isHardLevel(input));
try {
  const savedLevels = JSON.parse(localStorage.getItem(levelPreferenceKey));
  if (Array.isArray(savedLevels)) {
    levelInputs.forEach((input) => { input.checked = savedLevels.includes(input.value); });
  }
} catch { /* Dùng mặc định nếu thiết lập cũ không hợp lệ. */ }

if (!hardMode) levelInputs.filter(isHardLevel).forEach((input) => { input.checked = false; });
$("hardMode").checked = hardMode;
document.querySelectorAll(".hard-level").forEach((label) => label.classList.toggle("hidden", !hardMode));
function updateLevelSummary() {
  const available = availableLevels();
  const selected = available.filter((input) => input.checked);
  $("levelAll").checked = selected.length === available.length;
  $("levelAll").indeterminate = selected.length > 0 && selected.length < available.length;
  $("levelSummary").textContent = selected.length === available.length
    ? "Tất cả cấp độ"
    : selected.length === 0
      ? "Chưa chọn cấp độ"
      : selected.map((input) => input.value === "none" ? "Chưa phân loại" : input.value).join(", ");
}
updateLevelSummary();

function eligible() {
  const levels = new Set(availableLevels().filter((input) => input.checked).map((input) => input.value));
  return items.filter((item) => {
    const matchesMode = practiceMode === "review" ? item.learned : !item.learned && (practiceMode !== "focus" || item.focus === true);
    return matchesMode && levels.has(item.jlpt || "none");
  });
}
function updateStats() {
  const levels = new Set(availableLevels().filter((input) => input.checked).map((input) => input.value));
  let visibleTotal = 0, visibleLearned = 0, poolTotal = 0, done = 0;
  for (const item of items) {
    if (hardMode || (item.jlpt !== "N2" && item.jlpt !== "N1")) {
      visibleTotal++;
      if (item.learned) visibleLearned++;
    }
    if (levels.has(item.jlpt || "none")) {
      poolTotal++;
      if (item.learned) done++;
    }
  }
  $("totalStat").textContent = visibleTotal;
  $("learningStat").textContent = visibleTotal - visibleLearned;
  $("learnedStat").textContent = visibleLearned;
  $("navCount").textContent = items.length;
  const percent = poolTotal ? Math.round(done / poolTotal * 100) : 0;
  $("progressText").textContent = done + " / " + poolTotal + " chữ đã thuộc · " + percent + "%";
  $("progressNote").textContent = "Tiến độ ghi nhớ theo các cấp độ đang chọn.";
  $("progressBar").style.width = percent + "%";
}
function random() {
  let pool = eligible();
  if (pool.length > 1) pool = pool.filter((item) => item.id !== current);
  if (pool.length === 1 && pool[0].id === current) {
    toast("Không còn chữ khác trong chế độ và cấp độ đã chọn.");
    return;
  }
  // Ưu tiên tránh 5 chữ gần nhất; nếu bộ chữ nhỏ, giảm dần cửa sổ.
  let candidates = pool;
  for (let windowSize = Math.min(5, recentIds.length); windowSize > 0; windowSize--) {
    const recent = new Set(recentIds.slice(-windowSize));
    const filtered = pool.filter((item) => !recent.has(item.id));
    if (filtered.length) { candidates = filtered; break; }
  }
  const next = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)].id : null;
  if (next) { recentIds.push(next); if (recentIds.length > 20) recentIds.shift(); }
  if (current && current !== next) {
    practiceHistory.push({ id: current, revealed: answerRevealed });
    if (practiceHistory.length > 100) practiceHistory.shift();
  }
  current = next;
  answerRevealed = false;
  clearCanvas();
  renderPractice();
}

function previousKanji() {
  while (practiceHistory.length) {
    const previous = practiceHistory.pop();
    if (!items.some((item) => item.id === previous.id)) continue;
    current = previous.id;
    answerRevealed = previous.revealed;
    clearCanvas();
    renderPractice();
    return;
  }
  renderPractice();
}

function renderPractice() {
  updateStats();
  let item = items.find((x) => x.id === current);
  $("counter").textContent = eligible().length + (practiceMode === "review" ? " chữ để ôn" : practiceMode === "focus" ? " chữ đã chọn" : " chữ đang chờ");
  $("previousBtn").disabled = practiceHistory.length === 0;
  if (!item) {
    $("exerciseContent").innerHTML =
      `<div class="empty">✧<br><b>${practiceMode === "review" ? "Chưa có chữ đã học để ôn!" : practiceMode === "focus" ? "Danh sách đang học chưa có chữ phù hợp!" : "Không có chữ nào đang chờ!"}</b><br>${practiceMode === "review" ? "Hãy chọn cấp độ khác hoặc thêm chữ vào danh sách đã học." : practiceMode === "focus" ? "Hãy đổi cấp độ hoặc thêm chữ vào danh sách đang học sau khi xem đáp án." : "Hãy chọn cấp độ có chữ chưa thuộc, thêm chữ mới hoặc chọn học lại trong thư viện."}</div>`;
    return;
  }

  const isLearned = Boolean(item.learned);
  const isRevealed = practiceMode === "review" ? answerRevealed : isLearned || answerRevealed;
  const status = practiceMode === "review"
    ? (isRevealed ? "◌ &nbsp; Đang ôn · Đáp án đã hiện" : "◌ &nbsp; Đang ôn chữ đã học")
    : isLearned
    ? "<span>●</span> Đã thêm vào danh sách đã học"
    : isRevealed
      ? "◌ &nbsp; Đáp án đã hiện · Chữ vẫn đang học"
      : "◌ &nbsp; Chữ kanji đang được ẩn";
  const actions = practiceMode === "review"
    ? (isRevealed ? '<button class="secondary" id="relearn">↺ &nbsp; Đưa về đang học</button>' : '<button class="primary" id="reveal">✓ &nbsp; Xem đáp án</button>')
    : isLearned
    ? '<button class="secondary" id="relearn">↺ &nbsp; Học lại chữ này</button>'
    : isRevealed
      ? '<button class="primary" id="markLearned">＋ &nbsp; Thêm vào danh sách đã học</button>'
      : '<button class="primary" id="reveal">✓ &nbsp; Đã viết được &nbsp; · &nbsp; Xem đáp án</button>';

  $("exerciseContent").innerHTML =
    `<div class="kanji-display">${isRevealed ? `<div class="revealed">${esc(item.kanji)}</div>` : '<div class="mystery">?</div>'}</div>
      <div class="status">${status}${!isLearned && item.focus ? ' <span class="focus-indicator"> · Trong danh sách đang học</span>' : ""}</div>
      <div class="clues">
      <div class="clue"><small>CẤP ĐỘ JLPT</small>
        <b class="badge">${esc(item.jlpt || "—")}</b>
      </div>
      <div class="clue"><small>ÂM HÁN VIỆT</small>
        <b title="${esc(item.han)}">${esc(shortHan(item.han))}</b>
      </div>
      <div class="clue"><small>Ý NGHĨA</small>
        <b>${esc(item.meaning)}</b>
      </div></div>
      ${isRevealed && !isLearned ? `<div class="focus-action"><button class="focus-toggle ${item.focus ? "selected" : ""}" id="focusKanji" type="button" aria-pressed="${item.focus === true}">${item.focus ? "✓ Đã trong danh sách đang học · Bỏ chọn" : "＋ Thêm vào danh sách đang học"}</button></div>` : ""}
      <div class="exercise-actions">${actions}<div class="exercise-secondary-actions">${isRevealed && (!isLearned || practiceMode === "review") ? '<button class="secondary hide-kanji-btn" id="hideKanji" type="button" aria-label="Ẩn lại chữ kanji">Ẩn chữ</button>' : ""}<button class="secondary card-random-btn" id="randomBtn" type="button" title="Chọn một chữ khác đang học">↻ &nbsp; Chữ khác</button></div></div>${
        isRevealed
          ? `<div class="stroke-area" id="strokeArea"><b>✎ &nbsp; Thứ tự nét</b><div id="strokeContent">Đang tải hướng dẫn nét...</div>
      <div style="margin-top:8px;color:#9aa99c">Cách đọc: ${esc(item.reading || "Chưa thêm")} · Nguồn: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a></div></div>`
          : ""
      }`;

  if (isLearned && isRevealed) {
    if (practiceMode === "review") $("hideKanji").onclick = () => { answerRevealed = false; renderPractice(); };
    $("relearn").onclick = () => {
      item.learned = false;
      answerRevealed = false;
      save();
      if (practiceMode === "review") random(); else renderPractice();
      toast("Đã đưa chữ trở lại danh sách học");
    };
  } else if (isRevealed) {
    $("focusKanji").onclick = () => {
      item.focus = !item.focus;
      save();
      if (item.focus) {
        // Chữ vẫn chưa thuộc: giữ trong lượt random thông thường.
        const hasNext = eligible().some((candidate) => candidate.id !== item.id);
        if (hasNext) random();
        else renderPractice();
        toast(hasNext ? "Đã thêm vào danh sách đang học" : "Đã thêm vào danh sách đang học. Không còn chữ khác phù hợp.");
      } else {
        if (practiceMode === "focus") {
          current = null; practiceHistory = []; recentIds = []; random();
        } else renderPractice();
        toast("Đã bỏ khỏi danh sách đang học");
      }
    };
    $("hideKanji").onclick = () => {
      answerRevealed = false;
      renderPractice();
    };
    $("markLearned").onclick = () => {
      item.learned = true;
      item.focus = false;
      save();
      random();
      toast("Đã thêm vào danh sách đã học");
    };
  } else {
    $("reveal").onclick = () => {
      answerRevealed = true;
      renderPractice();
    };
  }

  if (isRevealed) loadStroke(item);
}
// 4. Tải SVG thứ tự nét từ KanjiVG
let strokeRequest = 0;
// Lưu SVG đã làm sạch trong phiên để không tải lại khi quay lại cùng chữ.
const strokeCache = new Map();
const strokePending = new Map();
async function getStrokeSvg(code) {
  if (strokeCache.has(code)) return strokeCache.get(code);
  if (strokePending.has(code)) return strokePending.get(code);
  const request = (async () => {
    const r = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`);
    if (!r.ok) throw new Error("Không tải được SVG");
    const text = await r.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg || doc.querySelector("parsererror")) throw new Error("SVG không hợp lệ");
    svg.querySelectorAll("script, foreignObject, image, a").forEach((e) => e.remove());
    svg.querySelectorAll("*").forEach((e) => [...e.attributes].forEach((a) => {
      if (a.name.startsWith("on") || a.name.includes("href")) e.removeAttribute(a.name);
    }));
    if (strokeCache.size >= 100) strokeCache.delete(strokeCache.keys().next().value);
    strokeCache.set(code, svg);
    return svg;
  })();
  strokePending.set(code, request);
  try { return await request; } finally { strokePending.delete(code); }
}
async function loadStroke(item) {
  const requestId = ++strokeRequest;
  const targetElement = $("strokeContent");
  let code = item.kanji.codePointAt(0).toString(16).padStart(5, "0");
  try {
    const svg = await getStrokeSvg(code);
    let target = $("strokeContent");
    if (requestId === strokeRequest && target === targetElement && items.find((x) => x.id === current)?.kanji === item.kanji) {
      target.textContent = "";
      target.appendChild(document.importNode(svg, true));
      let note = document.createElement("div");
      note.textContent = "Các số nhỏ chỉ thứ tự viết từng nét.";
      target.appendChild(note);
    }
  } catch {
    let t = $("strokeContent");
    if (requestId === strokeRequest && t && t === targetElement)
      t.textContent =
        "Không tải được hướng dẫn nét. Hãy kiểm tra kết nối hoặc thử chữ khác.";
  }
}
// 5. Thư viện: tìm kiếm, lọc và chuyển trang
function normalizeSearch(value) {
  return (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}
// Cache từng trường để tìm kiếm không dấu nhanh, vẫn cập nhật khi người dùng sửa dữ liệu.
const searchCache = new WeakMap();
function matchesSearch(item, query) {
  if (!query) return true;
  const fields = [item.kanji, item.han, item.meaning, item.reading, item.jlpt];
  let cached = searchCache.get(item);
  if (!cached || fields.some((value, index) => value !== cached.source[index])) {
    cached = { source: fields, normalized: fields.map(normalizeSearch) };
    searchCache.set(item, cached);
  }
  return cached.normalized.some((value) => value.includes(query));
}
// Hiển thị ngắn nếu có quá nhiều biến âm; không thay đổi dữ liệu đã lưu.
function shortHan(value) {
  return value.length > 45 ? value.split(",").slice(0, 2).join(",") + " …" : value;
}
let libraryPage = 1;
const libraryPageSize = 50;
function renderLibrary() {
  updateStats();
  let q = normalizeSearch($("search").value.trim()),
    f = $("libraryFilter").value,
    level = $("libraryLevel").value;
  let list = items.filter(
    (x) =>
      (level === "all" || (level === "none" ? !x.jlpt : x.jlpt === level)) &&
      (f === "all" || (f === "learned" ? x.learned : f === "focus" ? !x.learned && x.focus === true : !x.learned)) &&
      matchesSearch(x, q),
  );
  $("listCount").textContent = `${list.length} chữ`;
  const totalPages = Math.max(1, Math.ceil(list.length / libraryPageSize));
  libraryPage = Math.min(libraryPage, totalPages);
  $("libraryPagination").classList.toggle("hidden", totalPages <= 1);
  $("libraryPageLabel").textContent = `Trang ${libraryPage} / ${totalPages}`;
  $("libraryPrev").disabled = libraryPage <= 1;
  $("libraryNext").disabled = libraryPage >= totalPages;
  const visible = list.slice((libraryPage - 1) * libraryPageSize, libraryPage * libraryPageSize);
  $("libraryList").innerHTML = list.length
    ? visible
        .map(
          (x) =>
            `<div class="list-row">
      <div class="list-kanji">${esc(x.kanji)}</div>
      <div class="list-info"><b title="${esc(x.han)}">${esc(shortHan(x.han))} <span class="badge">${esc(x.jlpt || "—")}</span></b><small>${esc(x.meaning)}${x.reading ? " · " + esc(x.reading) : ""}</small></div><span class="list-status ${x.learned ? "done" : ""}">${x.learned ? "✓ Đã viết được" : x.focus ? "✦ Danh sách đang học" : "◌ Chưa thuộc"}</span>${!x.learned ? `<button class="row-btn" data-action="focus" data-id="${esc(x.id)}">${x.focus ? "Bỏ khỏi danh sách" : "Thêm vào danh sách"}</button>` : ""}<button class="row-btn" data-action="toggle" data-id="${esc(x.id)}">${x.learned ? "Học lại" : "Đánh dấu đã viết"}</button>
      <button class="row-btn" data-action="edit" data-id="${esc(x.id)}">Sửa</button>
      <button class="row-btn delete" data-action="delete" data-id="${esc(x.id)}">Xóa</button></div>`,
        )
        .join("")
    : '<div class="card empty">Không tìm thấy chữ nào. Hãy thử tìm kiếm khác hoặc thêm chữ mới.</div>';
}
function showPage(page) {
  document
    .querySelectorAll(".nav")
    .forEach((n) => n.classList.toggle("active", n.dataset.page === page));
  $("practicePage").classList.toggle("hidden", page !== "practice");
  $("libraryPage").classList.toggle("hidden", page !== "library");
  $("crumb").textContent = page === "practice" ? "Luyện tập" : "Thư viện kanji";
  if (page === "library") renderLibrary();
  else {
    let x = items.find((i) => i.id === current);
    if (!x || !eligible().some((i) => i.id === current))
      random();
    else renderPractice();
  }
}
document
  .querySelectorAll(".nav")
  .forEach((n) => (n.onclick = () => showPage(n.dataset.page)));
$("previousBtn").addEventListener("click", previousKanji);
$("exerciseContent").addEventListener("click", (event) => {
  if (event.target.closest("#randomBtn")) random();
});
$("practiceMode").addEventListener("change", (event) => {
  practiceMode = event.target.value;
  current = null; practiceHistory = []; recentIds = []; random();
});
$("hardMode").addEventListener("change", (event) => {
  hardMode = event.target.checked;
  localStorage.setItem(hardPreferenceKey, String(hardMode));
  if (!hardMode) levelInputs.filter(isHardLevel).forEach((input) => { input.checked = false; });
  document.querySelectorAll(".hard-level").forEach((label) => label.classList.toggle("hidden", !hardMode));
  localStorage.setItem(levelPreferenceKey, JSON.stringify(levelInputs.filter((input) => input.checked).map((input) => input.value)));
  updateLevelSummary();
  current = null; practiceHistory = []; recentIds = []; random();
});
$("levelFilter").addEventListener("change", (event) => {
  if (event.target.id === "levelAll") {
    availableLevels().forEach((input) => { input.checked = event.target.checked; });
  }
  updateLevelSummary();
  localStorage.setItem(levelPreferenceKey, JSON.stringify(levelInputs.filter((input) => input.checked).map((input) => input.value)));
  current = null;
  practiceHistory = [];
  recentIds = [];
  random();
});
document.addEventListener("click", (event) => {
  if (!$("levelPicker").contains(event.target)) $("levelPicker").open = false;
});
let searchTimer;
function resetLibraryPage() { clearTimeout(searchTimer); searchTimer = null; libraryPage = 1; renderLibrary(); }
$("search").oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(resetLibraryPage, 120); };
$("libraryFilter").onchange = resetLibraryPage;
$("libraryLevel").onchange = resetLibraryPage;
$("libraryPrev").onclick = () => { if (searchTimer) { resetLibraryPage(); return; } if (libraryPage > 1) { libraryPage--; renderLibrary(); } };
$("libraryNext").onclick = () => { if (searchTimer) { resetLibraryPage(); return; } libraryPage++; renderLibrary(); };
// 6. Thêm, chỉnh sửa và xóa chữ
function openForm(item) {
  $("kanjiForm").reset();
  $("editId").value = item?.id || "";
  $("modalTitle").textContent = item ? "Chỉnh sửa chữ kanji" : "Thêm chữ kanji";
  $("kanjiInput").value = item?.kanji || "";
  $("jlptInput").value = item?.jlpt || "";
  $("hanInput").value = item?.han || "";
  $("meaningInput").value = item?.meaning || "";
  $("readingInput").value = item?.reading || "";
  $("modal").classList.remove("hidden");
  $("kanjiInput").focus();
}
$("addBtn").onclick = () => openForm();
$("closeModal").onclick = $("cancelModal").onclick = () =>
  $("modal").classList.add("hidden");
$("kanjiForm").onsubmit = (e) => {
  e.preventDefault();
  let kanji = $("kanjiInput").value.trim();
  if (!/^\p{Script=Han}$/u.test(kanji)) {
    alert("Vui lòng nhập đúng một chữ kanji.");
    return;
  }
  let id = $("editId").value;
  if (items.some((x) => x.kanji === kanji && x.id !== id)) {
    alert("Chữ kanji này đã có trong thư viện.");
    return;
  }
  let data = {
    kanji,
    jlpt: $("jlptInput").value,
    han: $("hanInput").value.trim(),
    meaning: $("meaningInput").value.trim(),
    reading: $("readingInput").value.trim(),
  };
  if (!data.han || !data.meaning) return;
  if (id)
    Object.assign(
      items.find((x) => x.id === id),
      data,
    );
  else items.push({ id: crypto.randomUUID(), ...data, learned: false });
  save();
  $("modal").classList.add("hidden");
  renderLibrary();
  toast(id ? "Đã cập nhật chữ kanji" : "Đã thêm chữ kanji");
};
$("libraryList").onclick = (e) => {
  let b = e.target.closest("button");
  if (!b) return;
  let item = items.find((x) => x.id === b.dataset.id);
  if (!item) return;
  if (b.dataset.action === "edit") openForm(item);
  if (b.dataset.action === "focus" && !item.learned) {
    item.focus = !item.focus;
    save(); renderLibrary();
    toast(item.focus ? "Đã thêm vào danh sách đang học" : "Đã bỏ khỏi danh sách đang học");
  }
  if (b.dataset.action === "toggle") {
    item.learned = !item.learned;
    if (item.learned) item.focus = false;
    save();
    renderLibrary();
    toast(
      item.learned
        ? "Đã đánh dấu viết được"
        : "Đã đưa chữ trở lại danh sách học",
    );
  }
  if (
    b.dataset.action === "delete" &&
    confirm(`Xóa chữ ${item.kanji} khỏi thư viện?`)
  ) {
    const index = items.findIndex((x) => x.id === item.id);
    deletedItems.push({ item, index });
    items.splice(index, 1);
    save();
    renderLibrary();
    updateUndoNotice();
  }
};
// Có thể hoàn tác các lần xóa trong phiên hiện tại, theo thứ tự gần nhất.
function updateUndoNotice() {
  const last = deletedItems.at(-1);
  $("undoNotice").classList.toggle("hidden", !last);
  if (last) $("undoMessage").textContent = `Đã xóa chữ ${last.item.kanji}${deletedItems.length > 1 ? ` · ${deletedItems.length} chữ có thể khôi phục` : ""}`;
}
$("undoDelete").onclick = () => {
  const last = deletedItems.at(-1);
  if (!last) return;
  if (items.some((item) => item.id === last.item.id || item.kanji === last.item.kanji)) {
    toast("Không thể khôi phục vì chữ này đã có trong thư viện.");
    return;
  }
  deletedItems.pop();
  items.splice(Math.min(last.index, items.length), 0, last.item);
  save();
  renderLibrary();
  updateUndoNotice();
  toast("Đã khôi phục chữ kanji và tiến độ học");
};
$("dismissUndo").onclick = () => $("undoNotice").classList.add("hidden");
function renderTrash() {
  $("trashList").innerHTML = deletedItems.length ? deletedItems.map((entry, index) => `<div class="trash-row"><span><b>${esc(entry.item.kanji)}</b> &nbsp; ${esc(entry.item.han)}</span><button class="row-btn" data-restore="${index}">Khôi phục</button><button class="row-btn delete" data-remove="${index}">Xóa vĩnh viễn</button></div>`).reverse().join("") : '<p class="modal-description">Chưa có chữ nào được xóa.</p>';
}
$("trashBtn").onclick = () => { renderTrash(); $("trashModal").classList.remove("hidden"); };
$("closeTrash").onclick = () => $("trashModal").classList.add("hidden");
$("trashList").onclick = (event) => {
  const button = event.target.closest("button"); if (!button) return;
  const index = Number(button.dataset.restore ?? button.dataset.remove);
  const entry = deletedItems[index]; if (!entry) return;
  if (button.dataset.restore !== undefined) {
    if (items.some(item => item.id === entry.item.id || item.kanji === entry.item.kanji)) { toast("Chữ này đã có trong thư viện."); return; }
    items.splice(Math.min(entry.index, items.length), 0, entry.item);
  } else if (!confirm(`Xóa vĩnh viễn chữ ${entry.item.kanji}? Không thể hoàn tác thao tác này.`)) return;
  deletedItems.splice(index, 1); save(); renderTrash(); renderLibrary(); updateUndoNotice();
};
updateUndoNotice();
// 7. Sao lưu và khôi phục dữ liệu JSON
$("exportBtn").onclick = () => {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(items, null, 2)], { type: "application/json" }),
  );
  a.download = "net-kanji-sao-luu.json";
  a.click();
  URL.revokeObjectURL(a.href);
};
$("importBtn").onclick = () => $("importFile").click();
let pendingImport = null;
$("importFile").onchange = async (event) => {
  try {
    const file = event.target.files[0]; if (!file) return;
    const arr = JSON.parse(await file.text());
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("Tệp phải chứa ít nhất một chữ.");
    const seen = new Set();
    for (const [index, x] of arr.entries()) {
      if (!x || typeof x.kanji !== "string" || !/^\p{Script=Han}$/u.test(x.kanji) || typeof x.han !== "string" || !x.han.trim() || typeof x.meaning !== "string" || !x.meaning.trim()) throw new Error(`Mục ${index + 1} thiếu kanji, âm Hán Việt hoặc nghĩa hợp lệ.`);
      if (seen.has(x.kanji)) throw new Error(`Tệp có chữ ${x.kanji} bị trùng. Hãy sửa tệp trước khi nhập.`);
      if (x.jlpt && !["N5","N4","N3","N2","N1"].includes(x.jlpt)) throw new Error(`Cấp độ của ${x.kanji} không hợp lệ.`);
      if (x.reading != null && typeof x.reading !== "string") throw new Error(`Cách đọc của ${x.kanji} không hợp lệ.`);
      if (x.learned != null && typeof x.learned !== "boolean") throw new Error(`Trạng thái của ${x.kanji} không hợp lệ.`);
      if (x.focus != null && typeof x.focus !== "boolean") throw new Error(`Danh sách đang học của ${x.kanji} không hợp lệ.`);
      seen.add(x.kanji);
    }
    pendingImport = arr;
    const existing = new Set(items.map(x => x.kanji));
    const overlaps = arr.filter(x => existing.has(x.kanji)).length;
    $("importSummary").textContent = `Tệp có ${arr.length} chữ; ${overlaps} chữ đã có trong thư viện và ${arr.length - overlaps} chữ mới.`;
    $("importModal").classList.remove("hidden");
  } catch (error) {
    alert("Không thể nhập tệp: " + (error instanceof SyntaxError ? "JSON không hợp lệ." : error.message));
  } finally { event.target.value = ""; }
};
function closeImport() { pendingImport = null; $("importModal").classList.add("hidden"); }
$("closeImport").onclick = $("cancelImport").onclick = closeImport;
function commitImport(mode) {
  if (!pendingImport) return;
  if (mode === "replace" && !confirm("Thay thế toàn bộ danh sách hiện tại? Hãy xuất sao lưu trước khi tiếp tục.")) return;
  const existing = new Set(items.map(x => x.kanji));
  const source = mode === "merge" ? pendingImport.filter(x => !existing.has(x.kanji)) : pendingImport;
  const added = source.map(x => ({ id: crypto.randomUUID(), kanji: x.kanji, han: x.han.trim(), meaning: x.meaning.trim(), jlpt: x.jlpt || "", reading: x.reading || "", learned: x.learned === true, focus: x.learned !== true && x.focus === true }));
  items = mode === "merge" ? [...items, ...added] : added;
  save(); current = null; practiceHistory = []; recentIds = []; closeImport(); renderLibrary();
  toast(mode === "merge" ? `Đã thêm ${added.length} chữ mới` : "Đã thay thế danh sách");
}
$("mergeImport").onclick = () => commitImport("merge");
$("replaceImport").onclick = () => commitImport("replace");
// 8. Hộp hướng dẫn
$("helpBtn").onclick = () => $("helpModal").classList.remove("hidden");
$("closeHelp").onclick = $("gotIt").onclick = () =>
  $("helpModal").classList.add("hidden");
document.querySelectorAll(".modal").forEach(
  (m) =>
    (m.onclick = (e) => {
      if (e.target === m) m.classList.add("hidden");
    }),
);
// 9. Bảng tập viết bằng chuột hoặc cảm ứng
const canvas = $("canvas"),
  ctx = canvas.getContext("2d");
ctx.strokeStyle = "#315d4b";
ctx.lineWidth = 7;
ctx.lineCap = "round";
ctx.lineJoin = "round";
let drawing = false;
function pos(e) {
  let r = canvas.getBoundingClientRect();
  return [
    ((e.clientX - r.left) * canvas.width) / r.width,
    ((e.clientY - r.top) * canvas.height) / r.height,
  ];
}
canvas.onpointerdown = (e) => {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--theme-accent").trim() || "#315d4b";
  drawing = true;
  canvas.setPointerCapture(e.pointerId);
  let [x, y] = pos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 0.1, y + 0.1);
  ctx.stroke();
  $("canvasHint").style.display = "none";
};
canvas.onpointermove = (e) => {
  if (!drawing) return;
  let [x, y] = pos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
};
canvas.onpointerup = canvas.onpointercancel = () => (drawing = false);
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  $("canvasHint").style.display = "";
}
$("clearCanvas").onclick = clearCanvas;
random();

})();
