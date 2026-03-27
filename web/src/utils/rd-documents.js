function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDateOnly(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function generateRdDocumentNo(prefix) {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
  const randomSuffix = String(Math.floor(Math.random() * 1000)).padStart(
    3,
    "0",
  );
  return `${prefix}-${timestamp}-${randomSuffix}`;
}
