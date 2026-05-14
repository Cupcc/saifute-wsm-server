const naturalCodeCollator = new Intl.Collator("zh-Hans-CN", {
  numeric: true,
  sensitivity: "base",
});

function normalizeSortValue(value) {
  return value === null || typeof value === "undefined" ? "" : String(value);
}

export function compareNaturalCode(left, right) {
  const leftValue = normalizeSortValue(left);
  const rightValue = normalizeSortValue(right);

  if (leftValue === rightValue) {
    return 0;
  }
  if (!leftValue) {
    return -1;
  }
  if (!rightValue) {
    return 1;
  }

  return naturalCodeCollator.compare(leftValue, rightValue);
}
