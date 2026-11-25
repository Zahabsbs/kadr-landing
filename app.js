"use strict";
const C = window.KADR || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let toastTm;
function toast(msg, ms = 3200) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastTm); toastTm = setTimeout(() => t.classList.remove("on"), ms); }

/* ---------- тема ---------- */
$("#theme").onclick = () => {
  const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = n; try { localStorage.setItem("kadr-theme", n); } catch {}
  $('meta[name="theme-color"]').content = n === "dark" ? "#000000" : "#fbfbfd";
};

/* ---------- навигация ---------- */
const nav = $("#nav");
const onScroll = () => { nav.classList.toggle("solid", scrollY > 20); const h = $("#download").getBoundingClientRect().bottom; $("#sticky").classList.toggle("on", h < 0 && innerHeight + scrollY < document.body.scrollHeight - 300); };
addEventListener("scroll", onScroll, { passive: true }); onScroll();

/* ---------- появление при прокрутке ---------- */
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
$$(".reveal").forEach((el, i) => { el.style.transitionDelay = (el.closest(".hero") ? i * 70 : 0) + "ms"; io.observe(el); });

/* лёгкий параллакс телефонов в hero */
const stage = $(".stage");
if (stage && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const [l, c, r] = [$(".p-left"), $(".p-center"), $(".p-right")];
  const base = { l: getComputedStyle(l).transform, r: getComputedStyle(r).transform };
  addEventListener("scroll", () => {
    const k = Math.min(scrollY / 600, 1);
    l.style.translate = `${-k * 40}px ${-k * 30}px`; r.style.translate = `${k * 40}px ${-k * 30}px`; c.style.translate = `0 ${-k * 50}px`;
  }, { passive: true });
}

/* ---------- скачивание ---------- */
const meta = `версия ${C.version || ""} · ${C.apkSize || ""}`.replace(/ · $/, "");
$$("#apkBtn, [data-apk]").forEach((a) => {
  a.href = C.apkUrl || "#";
  a.setAttribute("download", (C.apkUrl || "Kadr.apk").split("/").pop());
  a.addEventListener("click", (e) => {
    if (!C.apkUrl) { e.preventDefault(); return toast("Ссылка на APK скоро появится"); }
    if (isIOS) { e.preventDefault(); return toast("Kadr пока только для Android"); }
    toast("Загрузка началась. Открой файл, чтобы установить Kadr", 4500);
  });
});
$$("#apkMeta, [data-apkmeta]").forEach((s) => (s.textContent = meta));
$("#apkFine").textContent = `Бесплатно · ${C.minAndroid || "Android"} · без регистрации`;

const rs = $("#rsBtn");
if (C.rustoreUrl) {
  rs.href = C.rustoreUrl; rs.target = "_blank"; rs.rel = "noopener"; rs.removeAttribute("aria-disabled"); rs.classList.add("live");
  $("small", rs).textContent = "Доступно в"; $("#rsSoon").remove();
} else {
  rs.addEventListener("click", (e) => { e.preventDefault(); toast("Kadr проходит модерацию в RuStore. Пока можно скачать APK"); });
}

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (isIOS) $("#apkFine").textContent = "Kadr пока только для Android. Версия для iPhone в планах.";

/* Telegram */
$$("[data-tg]").forEach((a) => (C.telegramUrl ? (a.href = C.telegramUrl) : a.remove()));

/* VirusTotal */
const VT = C.virustotal;
if (VT && VT.sha256) {
  const u = "https://www.virustotal.com/gui/file/" + VT.sha256;
  $("#vtLink").href = $("#vtBtn").href = u;
  $("#vtVer").textContent = "Kadr " + VT.version;
  $("#vtHash").textContent = "SHA-256 " + VT.sha256.slice(0, 8) + "…" + VT.sha256.slice(-8);
  $("#vtHash").title = VT.sha256;
} else { $("#safe").remove(); $('a[href="#safe"]')?.remove(); }

/* подвал */
if (C.privacyUrl) $("#privacy").href = C.privacyUrl; else $("#privacy").remove();
if (C.contactEmail) { const m = $("#mail"); m.hidden = false; m.href = "mailto:" + C.contactEmail; m.textContent = C.contactEmail; }
$("#yr").textContent = new Date().getFullYear();

/* ============================================================
   ОТЗЫВЫ
   Слой 1 (здесь): быстрые проверки и подсказки до отправки.
   Слой 2 (Supabase, reviews.sql): тот же фильтр на сервере, лимиты, дубли.
   Слой 3: премодерация — на сайте видны только одобренные.
   ============================================================ */
const REST = C.supabaseUrl && C.supabaseAnonKey ? C.supabaseUrl.replace(/\/$/, "") + "/rest/v1/reviews" : "";
const H = { apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey, "Content-Type": "application/json" };
const PAGE = 6;
let reviews = [], shown = PAGE;

function deviceId() {
  try {
    let d = localStorage.getItem("kadr-dev");
    if (!d) { d = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("kadr-dev", d); }
    return d;
  } catch { return "anon-" + Math.random().toString(16).slice(2).padEnd(16, "0"); }
}

const stars = (n) => `<span class="st" aria-label="${n} из 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="i ${i <= n ? "on" : ""}"><use href="#i-star"/></svg>`).join("")}</span>`;
const fdate = (d) => { try { return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

function paintReviews() {
  const list = $("#rvList");
  if (!reviews.length) {
    list.innerHTML = `<div class="rv-empty"><b>Будь первым</b>Расскажи, как тебе Kadr — отзыв появится здесь после проверки.</div>`;
    $("#rvScore").innerHTML = ""; return;
  }
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  $("#rvScore").innerHTML = `<b>${avg.toFixed(1).replace(".", ",")}</b>${stars(Math.round(avg))}<span>${reviews.length} ${plural(reviews.length, "отзыв", "отзыва", "отзывов")}</span>`;
  list.innerHTML = reviews.slice(0, shown).map((r) => `<article class="rv">
      <div class="who"><div class="av">${esc((r.name || "?").trim()[0].toUpperCase())}</div><div><b>${esc(r.name)}</b><small>${fdate(r.created_at || r.date)}</small></div></div>
      ${stars(r.rating)}<p>${esc(r.body || r.text)}</p></article>`).join("")
    + (reviews.length > shown ? `<button class="pill-btn ghost rv-more" id="rvMore">Показать ещё</button>` : "");
  const m = $("#rvMore"); if (m) m.onclick = () => { shown += PAGE; paintReviews(); };
}
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; }

async function loadReviews() {
  const seed = (C.seedReviews || []).map((r) => ({ ...r, body: r.text, created_at: r.date }));
  let live = [];
  if (REST) {
    try {
      const r = await fetch(REST + "?select=id,created_at,name,rating,body&order=created_at.desc&limit=500", { headers: H });
      if (r.ok) live = await r.json();
    } catch {}
  }
  reviews = [...live, ...seed]; paintReviews();
}

/* --- клиентский фильтр --- */
const LAT = { a: "а", e: "е", o: "о", p: "р", c: "с", x: "х", y: "у", k: "к", m: "м", t: "т", b: "в", h: "н", "0": "о", "3": "з", "4": "ч", "6": "б", "@": "а", "ё": "е" };
function normalize(s) {
  let n = s.toLowerCase().replace(/[aeopcxykmtbh0346@ё]/g, (ch) => LAT[ch] || ch);
  n = n.replace(/[^а-я .\-_*]/g, "");
  n = n.replace(/([а-я])[.\-_*]+(?=[а-я])/g, "$1");                       // «х.у.йня», «б-л-я» → слитно
  for (let i = 0; i < 6; i++) n = n.replace(/(^|\s)([а-я]{1,2}) +(?=[а-я]{1,2}(\s|$))/g, "$1$2");   // «х у й»
  return n.replace(/[^а-я ]/g, " ").replace(/(.)\1{2,}/g, "$1");
}
const BAD = /(^|\s)(ху[йеяи]|пизд|пезд|[её]б|за[её]б|у[её]б|въ[её]б|вы[её]б|бля|сук[аи](\s|$)|сучк|мудак|мудил|пид[оа]р|гандон|долбо[её]б|залуп|шлюх|манд[аы](\s|$)|дроч|чмо(\s|$)|дебил|ублюд|пзд)/;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(ru|com|net|org|io|me|su|рф|xyz|top|info|online|site|link|ly|cc|gg)\b|t\.me|@[a-z0-9_]{3,})/i;
const PHONE = /\+?\d[\d\s\-()]{8,}\d/;

function check(name, text, rating) {
  name = name.trim(); text = text.trim();
  if (!rating) return "Поставь оценку";
  if (name.length < 2) return "Как тебя зовут?";
  if (text.length < 15) return "Напиши хотя бы пару предложений";
  if (LINK.test(name + " " + text) || PHONE.test(text) || /@/.test(name)) return "Без ссылок, телефонов и @ников";
  if (BAD.test(normalize(name + " " + text))) return "Давай без грубостей";
  const letters = text.replace(/[^A-Za-zА-Яа-яЁё]/g, ""), caps = text.replace(/[^A-ZА-ЯЁ]/g, "");
  if (text.length > 20 && caps.length / Math.max(letters.length, 1) > .6) return "Слишком много заглавных букв";
  if (/(.)\1{6,}/.test(text)) return "Похоже на спам: много повторов";
  if (letters.length < text.length * .5) return "Похоже на спам: мало слов";
  return "";
}

/* --- форма --- */
const form = $("#rvForm"); let rating = 0, openedAt = 0;
$("#rvOpen").onclick = () => {
  const last = +localStorage.getItem("kadr-rv-at") || 0;
  if (Date.now() - last < 864e5) return toast("Спасибо! Твой отзыв уже на проверке");
  form.hidden = false; openedAt = Date.now(); $("#rvOpen").hidden = true; form.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => $("#rvName").focus(), 400);
};
$("#rvCancel").onclick = () => { form.hidden = true; $("#rvOpen").hidden = false; };
$$("#rvStars button").forEach((b) => (b.onclick = () => { rating = +b.dataset.v; $$("#rvStars button").forEach((x) => x.classList.toggle("on", +x.dataset.v <= rating)); $("#rvErr").textContent = ""; }));
$("#rvText").oninput = () => { $("#rvCount").textContent = `${$("#rvText").value.length} / 600`; $("#rvErr").textContent = ""; };

form.onsubmit = async (e) => {
  e.preventDefault();
  const name = $("#rvName").value, text = $("#rvText").value;
  const err = check(name, text, rating); if (err) { $("#rvErr").textContent = err; return; }
  // бот: заполнил скрытое поле или отправил быстрее 4 секунд — делаем вид, что всё ок
  if ($("#rvWeb").value || Date.now() - openedAt < 4000) return done();
  if (!REST) return toast("Отзывы скоро заработают");
  const b = $("#rvSend"); b.disabled = true; b.textContent = "Отправляю…";
  try {
    const r = await fetch(REST, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ name: name.trim(), rating, body: text.trim(), device: deviceId() }) });
    if (r.ok) return done();
    const j = await r.json().catch(() => ({}));
    const m = String(j.message || "");
    $("#rvErr").textContent = m.includes("rate_limited") ? "Один отзыв в сутки — твой уже на проверке" : m.includes("duplicate") ? "Такой отзыв уже есть" : m.includes("busy") ? "Слишком много отзывов, попробуй через час" : "Не получилось отправить. Попробуй позже";
  } catch { $("#rvErr").textContent = "Нет связи. Проверь интернет"; }
  finally { b.disabled = false; b.textContent = "Отправить"; }
};
function done() {
  try { localStorage.setItem("kadr-rv-at", Date.now()); } catch {}
  form.reset(); rating = 0; $$("#rvStars button").forEach((x) => x.classList.remove("on")); $("#rvCount").textContent = "0 / 600";
  form.hidden = true; $("#rvOpen").hidden = false;
  toast("Спасибо! Отзыв появится после проверки", 4500);
}

loadReviews();
