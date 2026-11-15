// Almacenamiento compartido entre la app y el service worker (IndexedDB)
const DB_NAME = "cumples-db";
const STORE = "kv";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGet(key, fallback) {
  const db = await openDB();
  return new Promise((resolve) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result === undefined ? fallback : r.result);
    r.onerror = () => resolve(fallback);
  });
}
async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Lógica de fechas ----
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
// Fecha del cumpleaños en un año dado (29-feb -> 28-feb en años no bisiestos)
function bdayInYear(b, year) {
  let d = b.day;
  if (b.month === 2 && b.day === 29 && !isLeap(year)) d = 28;
  return new Date(year, b.month - 1, d);
}
function startOfToday(now = new Date()) { return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
// Próxima ocurrencia (hoy incluido)
function nextOccurrence(b, now = new Date()) {
  const today = startOfToday(now);
  let d = bdayInYear(b, today.getFullYear());
  if (d < today) d = bdayInYear(b, today.getFullYear() + 1);
  return d;
}
function daysUntil(b, now = new Date()) {
  return Math.round((nextOccurrence(b, now) - startOfToday(now)) / 86400000);
}
function ageTurning(b, now = new Date()) {
  if (!b.year) return null;
  return nextOccurrence(b, now).getFullYear() - b.year;
}
function todaysBirthdays(list, now = new Date()) {
  return list.filter((b) => daysUntil(b, now) === 0);
}
function todayKey(now = new Date()) {
  return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
}

// Muestra el aviso de los cumpleaños de hoy una sola vez por día
async function notifyTodayIfNeeded(registration) {
  const list = await dbGet("birthdays", []);
  const hoy = todaysBirthdays(list);
  if (!hoy.length) return false;
  const key = todayKey();
  if ((await dbGet("lastNotified", "")) === key) return false;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const names = hoy.map((b) => {
    const a = ageTurning(b);
    return a ? `${b.name} (${a} años)` : b.name;
  });
  await registration.showNotification("🎂 ¡Hoy es un cumpleaños!", {
    body: "Felicita a " + names.join(", "),
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "cumple-" + key,
    vibrate: [200, 100, 200],
  });
  await dbSet("lastNotified", key);
  return true;
}
