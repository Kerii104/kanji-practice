// 1. Khởi tạo dữ liệu và cập nhật danh sách cũ khi cần
const key = "net-kanji-v1";
const kanshudoMigration = "net-kanji-kanshudo-n5n4-v1";

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

let items;
try {
  items = JSON.parse(localStorage.getItem(key));
} catch {
  items = null;
}

if (!Array.isArray(items)) {
  // Trình duyệt mới: chỉ sử dụng một nguồn dữ liệu mặc định.
  items = kanshudoSeed.map(createKanji);
  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(kanshudoMigration, "1");
} else if (!localStorage.getItem(kanshudoMigration)) {
  // Dữ liệu cũ: chỉ bổ sung chữ còn thiếu và đồng bộ cấp độ một lần.
  // Không ghi đè nội dung tự sửa, ID hay tiến độ học.
  const byChar = new Map(items.map((item) => [item.kanji, item]));
  for (const row of kanshudoSeed) {
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
// 2. Trạng thái phiên học và các hàm tiện ích
let current = null;
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
  localStorage.setItem(key, JSON.stringify(items));
}
function toast(s) {
  $("toast").textContent = s;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2500);
}
// 3. Chọn chữ ngẫu nhiên và hiển thị thẻ luyện tập
function eligible() {
  let f = $("levelFilter").value;
  return items.filter(
    (x) =>
      !x.learned && (f === "all" || (f === "none" ? !x.jlpt : x.jlpt === f)),
  );
}
function updateStats() {
  $("totalStat").textContent = items.length;
  $("learningStat").textContent = items.filter((x) => !x.learned).length;
  $("learnedStat").textContent = items.filter((x) => x.learned).length;
  $("navCount").textContent = items.length;
  let done = items.filter((x) => x.learned).length;
  let percent = items.length ? Math.round((done / items.length) * 100) : 0;
  $("progressText").textContent =
    done + " / " + items.length + " chữ · " + percent + "%";
  $("progressBar").style.width = percent + "%";
}
function random() {
  let pool = eligible();
  if (pool.length > 1) pool = pool.filter((x) => x.id !== current);
  current = pool.length
    ? pool[Math.floor(Math.random() * pool.length)].id
    : null;
  clearCanvas();
  renderPractice();
}
function renderPractice() {
  updateStats();
  let item = items.find((x) => x.id === current);
  $("counter").textContent = eligible().length + " chữ đang chờ";
  if (!item) {
    $("exerciseContent").innerHTML =
      '<div class="empty">✧<br><b>Không còn chữ nào đang chờ!</b><br>Hãy thêm chữ mới, đổi cấp độ hoặc chọn học lại trong thư viện.</div>';
    return;
  }
  let revealed = item.learned;
  $("exerciseContent").innerHTML =
    `<div class="kanji-display">${revealed ? `<div class="revealed">${esc(item.kanji)}</div>` : '<div class="mystery">?</div>'}</div>
      <div class="status">${revealed ? "<span>●</span> Đã viết được · Đáp án của bạn" : "◌ &nbsp; Chữ kanji đang được ẩn"}</div>
      <div class="clues">
      <div class="clue"><small>CẤP ĐỘ JLPT</small>
        <b class="badge">${esc(item.jlpt || "—")}</b>
      </div>
      <div class="clue"><small>ÂM HÁN VIỆT</small>
        <b>${esc(item.han)}</b>
      </div>
      <div class="clue"><small>Ý NGHĨA</small>
        <b>${esc(item.meaning)}</b>
      </div></div>
      <div class="exercise-actions">${revealed ? '<button class="secondary" id="relearn">↺ &nbsp; Học lại chữ này</button><button class="primary" id="next">Chữ tiếp theo &nbsp; →</button>' : '<button class="primary" id="reveal">✓ &nbsp; Đã viết được &nbsp; · &nbsp; Xem đáp án</button>'}</div>${
        revealed
          ? `<div class="stroke-area" id="strokeArea"><b>✎ &nbsp; Thứ tự nét</b><div id="strokeContent">Đang tải hướng dẫn nét...</div>
      <div style="margin-top:8px;color:#9aa99c">Cách đọc: ${esc(item.reading || "Chưa thêm")} · Nguồn: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a></div></div>`
          : ""
      }`;
  if (revealed) {
    $("relearn").onclick = () => {
      item.learned = false;
      save();
      renderPractice();
      toast("Đã đưa chữ trở lại danh sách học");
    };
    $("next").onclick = random;
    loadStroke(item);
  } else
    $("reveal").onclick = () => {
      item.learned = true;
      save();
      renderPractice();
    };
}
// 4. Tải SVG thứ tự nét từ KanjiVG
async function loadStroke(item) {
  let code = item.kanji.codePointAt(0).toString(16).padStart(5, "0");
  try {
    let r = await fetch(
      `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`,
    );
    if (!r.ok) throw 0;
    let text = await r.text();
    let doc = new DOMParser().parseFromString(text, "image/svg+xml");
    let svg = doc.querySelector("svg");
    if (!svg || doc.querySelector("parsererror")) throw 0;
    svg
      .querySelectorAll("script, foreignObject, image, a")
      .forEach((e) => e.remove());
    svg.querySelectorAll("*").forEach((e) =>
      [...e.attributes].forEach((a) => {
        if (a.name.startsWith("on") || a.name.includes("href"))
          e.removeAttribute(a.name);
      }),
    );
    let target = $("strokeContent");
    if (target && items.find((x) => x.id === current)?.kanji === item.kanji) {
      target.textContent = "";
      target.appendChild(document.importNode(svg, true));
      let note = document.createElement("div");
      note.textContent = "Các số nhỏ chỉ thứ tự viết từng nét.";
      target.appendChild(note);
    }
  } catch {
    let t = $("strokeContent");
    if (t)
      t.textContent =
        "Không tải được hướng dẫn nét. Hãy kiểm tra kết nối hoặc thử chữ khác.";
  }
}
// 5. Thư viện: tìm kiếm, lọc và chuyển trang
function renderLibrary() {
  updateStats();
  let q = $("search").value.toLowerCase().trim(),
    f = $("libraryFilter").value,
    level = $("libraryLevel").value;
  let list = items.filter(
    (x) =>
      (level === "all" || (level === "none" ? !x.jlpt : x.jlpt === level)) &&
      [x.kanji, x.han, x.meaning, x.reading, x.jlpt].some((v) =>
        (v || "").toLowerCase().includes(q),
      ) &&
      (f === "all" || (f === "learned" ? x.learned : !x.learned)),
  );
  $("listCount").textContent = `${list.length} chữ`;
  $("libraryList").innerHTML = list.length
    ? list
        .map(
          (x) =>
            `<div class="list-row">
      <div class="list-kanji">${esc(x.kanji)}</div>
      <div class="list-info"><b>${esc(x.han)} <span class="badge">${esc(x.jlpt || "—")}</span></b><small>${esc(x.meaning)}${x.reading ? " · " + esc(x.reading) : ""}</small></div><span class="list-status ${x.learned ? "done" : ""}">${x.learned ? "✓ Đã viết được" : "◌ Đang học"}</span><button class="row-btn" data-action="toggle" data-id="${esc(x.id)}">${x.learned ? "Học lại" : "Đánh dấu đã viết"}</button>
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
    if (!x || (!x.learned && !eligible().some((i) => i.id === current)))
      random();
    else renderPractice();
  }
}
document
  .querySelectorAll(".nav")
  .forEach((n) => (n.onclick = () => showPage(n.dataset.page)));
$("randomBtn").onclick = random;
$("levelFilter").onchange = random;
$("search").oninput = renderLibrary;
$("libraryFilter").onchange = renderLibrary;
$("libraryLevel").onchange = renderLibrary;
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
  if (b.dataset.action === "toggle") {
    item.learned = !item.learned;
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
    items = items.filter((x) => x.id !== item.id);
    save();
    renderLibrary();
    toast("Đã xóa chữ kanji");
  }
};
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
$("importFile").onchange = async (e) => {
  try {
    let arr = JSON.parse(await e.target.files[0].text());
    if (
      !Array.isArray(arr) ||
      !arr.every(
        (x) =>
          x &&
          typeof x.kanji === "string" &&
          /^\p{Script=Han}$/u.test(x.kanji) &&
          typeof x.han === "string" &&
          typeof x.meaning === "string",
      )
    )
      throw 0;
    if (
      !confirm(
        `Thay thế danh sách hiện tại bằng ${arr.length} chữ từ tệp? Hãy xuất sao lưu trước nếu cần.`,
      )
    )
      return;
    items = arr.map((x) => ({
      id: crypto.randomUUID(),
      kanji: x.kanji,
      han: x.han,
      meaning: x.meaning,
      jlpt: ["N5", "N4", "N3", "N2", "N1"].includes(x.jlpt) ? x.jlpt : "",
      reading: typeof x.reading === "string" ? x.reading : "",
      learned: x.learned === true,
    }));
    save();
    current = null;
    renderLibrary();
    toast("Đã nhập dữ liệu");
  } catch {
    alert("Tệp không hợp lệ. Vui lòng dùng tệp JSON được xuất từ Nét Kanji.");
  } finally {
    e.target.value = "";
  }
};
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
