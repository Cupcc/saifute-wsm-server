const LEGACY_PERMISSION_ALIAS_MAP = {
  "master:material:list": ["base:material:list"],
  "master:material:create": ["base:material:add"],
  "master:material:update": ["base:material:edit"],
  "master:customer:list": ["base:customer:list"],
  "master:supplier:list": ["base:supplier:list"],
  "master:personnel:list": ["base:personnel:list"],
  "master:workshop:list": ["base:workshop:list"],
  "inbound:order:list": ["entry:order:list", "entry:detail:list"],
  "inbound:order:create": ["entry:order:add"],
  "inbound:order:update": ["entry:order:edit"],
  "inbound:order:void": ["entry:order:remove"],
  "inbound:into-order:list": ["entry:intoOrder:list", "entry:intoDetail:list"],
  "inbound:into-order:create": ["entry:intoOrder:add"],
  "inbound:into-order:update": ["entry:intoOrder:edit"],
  "inbound:into-order:void": ["entry:intoOrder:remove"],
  "workshop-material:pick-order:list": [
    "take:pickOrder:list",
    "take:pickDetail:list",
  ],
  "workshop-material:pick-order:create": ["take:pickOrder:add"],
  "workshop-material:pick-order:void": ["take:pickOrder:remove"],
  "workshop-material:return-order:list": [
    "take:returnOrder:list",
    "take:returnDetail:list",
  ],
  "workshop-material:return-order:create": ["take:returnOrder:add"],
  "workshop-material:return-order:void": ["take:returnOrder:remove"],
  "workshop-material:scrap-order:list": [
    "stock:scrapOrder:list",
    "stock:scrapDetail:list",
  ],
  "workshop-material:scrap-order:create": ["stock:scrapOrder:add"],
  "workshop-material:scrap-order:void": ["stock:scrapOrder:remove"],
  "inventory:balance:list": ["stock:inventory:list", "stock:warning:list"],
  "inventory:factory-number:list": ["stock:interval:list"],
  "inventory:log:list": ["stock:log:list"],
  "inventory:source-usage:list": ["stock:used:list"],
  "workflow:audit:create": ["audit:document:add"],
  "workflow:audit:approve": ["audit:document:add"],
  "workflow:audit:reject": ["audit:document:add"],
  "workflow:audit:reset": ["audit:document:add"],
};

export function expandPermissionAliases(permissions = []) {
  const expanded = new Set(
    Array.isArray(permissions) ? permissions.filter(Boolean) : [],
  );

  for (const permission of expanded) {
    const aliases = LEGACY_PERMISSION_ALIAS_MAP[permission];
    if (!aliases) {
      continue;
    }

    for (const alias of aliases) {
      expanded.add(alias);
    }
  }

  return [...expanded];
}
