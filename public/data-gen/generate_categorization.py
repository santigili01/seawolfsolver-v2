#!/usr/bin/env python3
"""Generate categorization_pools.json for the Microbe Categorization simulator phase."""

from __future__ import annotations

import json
import pathlib
import random
import re
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Sequence, Tuple

PREFIXES = [
    "Cyro",
    "Thermo",
    "Hydro",
    "Bio",
    "Aero",
    "Ferro",
    "Chromo",
    "Nano",
    "Macro",
    "Micro",
    "Aqua",
    "Terra",
    "Pyro",
    "Cryo",
    "Photo",
    "Geo",
    "Chemo",
    "Halo",
    "Nitro",
    "Sulfo",
]
SUFFIXES = [
    "Amoeba",
    "Bacillus",
    "Coccus",
    "Spirillum",
    "Vibrio",
    "Proteus",
    "Phage",
    "Zoan",
    "Morph",
    "Plasm",
    "Cyte",
    "Spore",
    "Bacter",
    "Cocci",
    "Myces",
    "Flagella",
    "Pilus",
    "Capsid",
    "Soma",
    "Filum",
]
TRAITS = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES = ["Mobility", "Agility", "Size"]
POOLS_PER_PAIR = 5
MAX_ATTEMPTS = 10000

HADAL_ID = 11


def slugify(label: str) -> str:
    s = label.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def rng_int(rng: random.Random, low: int, high: int) -> int:
    return rng.randint(low, high)


def attr_range(site: Dict[str, Any], attr: str) -> Tuple[int, int]:
    r = site["attributes"][attr]
    return int(r["min"]), int(r["max"])


def ranges_non_overlapping(
    lo1: int, hi1: int, lo2: int, hi2: int
) -> bool:
    """True if [lo1,hi1] and [lo2,hi2] do not overlap (touching at a point counts as overlapping)."""
    return hi1 < lo2 or hi2 < lo1


def pair_has_disjoint_attribute(
    site1: Dict[str, Any], site2: Dict[str, Any]
) -> bool:
    """At least one attribute has non-overlapping ranges between site1 and site2."""
    for attr in ATTRIBUTES:
        lo1, hi1 = attr_range(site1, attr)
        lo2, hi2 = attr_range(site2, attr)
        if ranges_non_overlapping(lo1, hi1, lo2, hi2):
            return True
    return False


def microbe_attrs(microbe: Dict[str, Any]) -> Tuple[int, int, int, str]:
    return (
        int(microbe["Mobility"]),
        int(microbe["Agility"]),
        int(microbe["Size"]),
        str(microbe["trait"]),
    )


def inviable_for_attr(microbe: Dict[str, Any], site: Dict[str, Any], attr: str) -> bool:
    lo, hi = attr_range(site, attr)
    v = int(microbe[attr])
    return (v + 10 + 10 < 3 * lo) or (v + 1 + 1 > 3 * hi)


def inviable_for_site(microbe: Dict[str, Any], site: Dict[str, Any]) -> bool:
    return any(inviable_for_attr(microbe, site, a) for a in ATTRIBUTES)


def inviable_attribute_names(microbe: Dict[str, Any], site: Dict[str, Any]) -> List[str]:
    return [a for a in ATTRIBUTES if inviable_for_attr(microbe, site, a)]


def attributes_in_range_count(microbe: Dict[str, Any], site: Dict[str, Any]) -> int:
    n = 0
    for attr in ATTRIBUTES:
        lo, hi = attr_range(site, attr)
        v = int(microbe[attr])
        if lo <= v <= hi:
            n += 1
    return n


def satisfies_revealed(microbe: Dict[str, Any], revealed: Dict[str, Any]) -> bool:
    if revealed["type"] == "trait":
        return str(microbe["trait"]) == str(revealed["value"])
    if revealed["type"] == "attribute":
        name = str(revealed["name"])
        val = revealed["value"]
        lo, hi = int(val["min"]), int(val["max"])
        v = int(microbe[name])
        return lo <= v <= hi
    raise ValueError(f"Unknown revealed type: {revealed.get('type')}")


def site_attr_extreme(site: Dict[str, Any], attr: str) -> bool:
    lo, hi = attr_range(site, attr)
    return lo <= 3 or hi >= 8


def site2_extreme_attributes(site2: Dict[str, Any]) -> List[str]:
    return [a for a in ATTRIBUTES if site_attr_extreme(site2, a)]


def pick_revealed_characteristic(site2: Dict[str, Any], rng: random.Random) -> Dict[str, Any]:
    extremes = site2_extreme_attributes(site2)
    if extremes:
        name = rng.choice(extremes)
        lo, hi = attr_range(site2, name)
        return {"type": "attribute", "name": name, "value": {"min": lo, "max": hi}}
    choices: List[Dict[str, Any]] = [
        {
            "type": "trait",
            "name": str(site2["desired_trait"]),
            "value": str(site2["desired_trait"]),
        }
    ]
    for attr in ATTRIBUTES:
        lo, hi = attr_range(site2, attr)
        choices.append({"type": "attribute", "name": attr, "value": {"min": lo, "max": hi}})
    return dict(rng.choice(choices))


def revealed_summary_text(revealed: Dict[str, Any]) -> str:
    if revealed["type"] == "trait":
        return str(revealed["value"])
    name = str(revealed["name"])
    val = revealed["value"]
    return f"{name} in range {val['min']}-{val['max']}"


def revealed_name_for_return_reason(revealed: Dict[str, Any]) -> str:
    if revealed["type"] == "trait":
        return str(revealed["value"])
    return str(revealed["name"])


def site1_branch_b(microbe: Dict[str, Any], site1: Dict[str, Any]) -> bool:
    for attr in ATTRIBUTES:
        if not site_attr_extreme(site1, attr):
            continue
        lo, hi = attr_range(site1, attr)
        v = int(microbe[attr])
        if lo <= v <= hi:
            return True
    return False


def site1_branch_c(microbe: Dict[str, Any], site1: Dict[str, Any]) -> bool:
    n = attributes_in_range_count(microbe, site1)
    if n < 2:
        return False
    for attr in ATTRIBUTES:
        lo, hi = attr_range(site1, attr)
        v = int(microbe[attr])
        if lo <= v <= hi:
            continue
        d_lo = abs(v - lo)
        d_hi = abs(v - hi)
        if min(d_lo, d_hi) > 2:
            return False
    return True


def qualifies_site1(
    microbe: Dict[str, Any],
    site1: Dict[str, Any],
    site2: Dict[str, Any],
    revealed: Dict[str, Any],
) -> bool:
    if str(microbe["trait"]) == str(site1["undesired_trait"]):
        return False
    if inviable_for_site(microbe, site1):
        return False
    if str(microbe["trait"]) == str(site2["undesired_trait"]):
        return False
    if satisfies_revealed(microbe, revealed):
        return False
    cond5 = (
        str(microbe["trait"]) == str(site1["desired_trait"])
        or site1_branch_b(microbe, site1)
        or site1_branch_c(microbe, site1)
    )
    return cond5


def qualifies_site2(
    microbe: Dict[str, Any],
    site1: Dict[str, Any],
    site2: Dict[str, Any],
    revealed: Dict[str, Any],
) -> bool:
    if not satisfies_revealed(microbe, revealed):
        return False
    if str(microbe["trait"]) == str(site2["undesired_trait"]):
        return False
    if inviable_for_site(microbe, site1):
        return True
    if str(microbe["trait"]) == str(site1["undesired_trait"]):
        return True
    if attributes_in_range_count(microbe, site1) <= 1:
        return True
    return False


def qualifies_return(
    microbe: Dict[str, Any],
    site1: Dict[str, Any],
    revealed: Dict[str, Any],
) -> bool:
    if satisfies_revealed(microbe, revealed):
        return False
    if inviable_for_site(microbe, site1):
        return True
    if str(microbe["trait"]) == str(site1["undesired_trait"]):
        return True
    if attributes_in_range_count(microbe, site1) == 0:
        return True
    return False


def random_microbe(rng: random.Random, existing_keys: set) -> Dict[str, Any]:
    while True:
        m = {
            "Mobility": rng_int(rng, 1, 10),
            "Agility": rng_int(rng, 1, 10),
            "Size": rng_int(rng, 1, 10),
            "trait": rng.choice(TRAITS),
            "name": f"{rng.choice(PREFIXES)} {rng.choice(SUFFIXES)}",
        }
        key = microbe_attrs(m)
        if key not in existing_keys:
            existing_keys.add(key)
            return m


def viable_site1_sentence(microbe: Dict[str, Any], site1: Dict[str, Any]) -> str:
    if inviable_for_site(microbe, site1):
        return ""
    return ". Viable for Site 1 on all attributes"


def reason_site1(
    microbe: Dict[str, Any],
    site1: Dict[str, Any],
) -> str:
    bullets: List[str] = []

    if str(microbe["trait"]) == str(site1["desired_trait"]):
        bullets.append(f"Has desired trait ({microbe['trait']}) for Site 1")

    for attr in ATTRIBUTES:
        if not site_attr_extreme(site1, attr):
            continue
        lo, hi = attr_range(site1, attr)
        v = int(microbe[attr])
        if lo <= v <= hi:
            bullets.append(
                f"Has extreme attribute {attr} ({v}) within Site 1 range {lo}-{hi}"
            )

    if site1_branch_c(microbe, site1):
        n_in = attributes_in_range_count(microbe, site1)
        msg = f"Has {n_in} attributes in range for Site 1"
        if msg not in bullets:
            bullets.append(msg)

    body = ". ".join(bullets)
    suf = viable_site1_sentence(microbe, site1)

    combined = body + suf if body else suf.strip()
    if combined and not combined.endswith("."):
        combined = combined + "."
    return combined.strip()


def reason_site2(
    microbe: Dict[str, Any],
    site1: Dict[str, Any],
    revealed: Dict[str, Any],
) -> str:
    parts: List[str] = [f"Satisfies Site 2 insight: {revealed_summary_text(revealed)}"]

    attrs_inv = inviable_attribute_names(microbe, site1)
    if attrs_inv:
        if len(attrs_inv) == 1:
            parts.append(f"Inviable for Site 1 on {attrs_inv[0]}")
        else:
            parts.append(f"Inviable for Site 1 on {', '.join(attrs_inv)}")

    if str(microbe["trait"]) == str(site1["undesired_trait"]):
        parts.append(f"Has undesired trait for Site 1 ({microbe['trait']})")

    n_in = attributes_in_range_count(microbe, site1)
    if not attrs_inv and str(microbe["trait"]) != str(site1["undesired_trait"]):
        if n_in <= 1:
            parts.append(f"Only {n_in} attribute(s) in range for Site 1")

    combined = parts[0]
    for p in parts[1:]:
        combined = f"{combined}. {p}"
    if not combined.endswith("."):
        combined = combined + "."
    return combined.strip()


def reason_return(
    microbe: Dict[str, Any],
    site1: Dict[str, Any],
    revealed: Dict[str, Any],
) -> str:
    rname = revealed_name_for_return_reason(revealed)
    parts: List[str] = [f"Does not satisfy Site 2 insight ({rname})"]

    attrs_inv = inviable_attribute_names(microbe, site1)
    if attrs_inv:
        if len(attrs_inv) == 1:
            parts.append(f"Inviable for Site 1 on {attrs_inv[0]}")
        else:
            parts.append(f"Inviable for Site 1 on {', '.join(attrs_inv)}")

    if str(microbe["trait"]) == str(site1["undesired_trait"]):
        parts.append(f"Has undesired trait for Site 1 ({microbe['trait']})")

    n_in = attributes_in_range_count(microbe, site1)
    if not attrs_inv and str(microbe["trait"]) != str(site1["undesired_trait"]):
        if n_in == 0:
            parts.append("No attributes in range for Site 1")

    combined = parts[0]
    for p in parts[1:]:
        combined = f"{combined}. {p}"
    if not combined.endswith("."):
        combined = combined + "."
    return combined.strip()


def build_site_requirements(sc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "attributes": json.loads(json.dumps(sc["attributes"])),
        "desired_trait": sc["desired_trait"],
        "undesired_trait": sc["undesired_trait"],
    }


def try_generate_pool(
    site1: Dict[str, Any],
    site2: Dict[str, Any],
    revealed: Dict[str, Any],
    a: int,
    b: int,
    c: int,
    rng: random.Random,
) -> Optional[
    Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, str]]], bool, List[str]]
]:
    existing: set = set()
    site1_list: List[Dict[str, Any]] = []
    site2_list: List[Dict[str, Any]] = []
    ret_list: List[Dict[str, Any]] = []

    pair_label = f"{site1['name']}__{site2['name']}"

    def gen_one(kind: str, category_label: str) -> Optional[Dict[str, Any]]:
        for _ in range(MAX_ATTEMPTS):
            m = random_microbe(rng, existing)
            if kind == "site1" and qualifies_site1(m, site1, site2, revealed):
                return m
            if kind == "site2" and qualifies_site2(m, site1, site2, revealed):
                return m
            if kind == "return" and qualifies_return(m, site1, revealed):
                return m
            existing.discard(microbe_attrs(m))
        print(
            f"WARN: MAX_ATTEMPTS ({MAX_ATTEMPTS}) exceeded for microbe generation "
            f"pair={pair_label} category={category_label}"
        )
        return None

    for _ in range(a):
        m = gen_one("site1", "site1")
        if m is None:
            return None
        site1_list.append(m)
    for _ in range(b):
        m = gen_one("site2", "site2")
        if m is None:
            return None
        site2_list.append(m)
    for _ in range(c):
        m = gen_one("return", "return")
        if m is None:
            return None
        ret_list.append(m)

    # Build reasons before shuffle using object identity via tuple key
    correct: Dict[str, List[Dict[str, str]]] = {"site1": [], "site2": [], "return": []}
    for m in site1_list:
        correct["site1"].append({"key": repr(microbe_attrs(m)), "reason": reason_site1(m, site1)})
    for m in site2_list:
        correct["site2"].append({"key": repr(microbe_attrs(m)), "reason": reason_site2(m, site1, revealed)})
    for m in ret_list:
        correct["return"].append({"key": repr(microbe_attrs(m)), "reason": reason_return(m, site1, revealed)})

    all_microbes = site1_list + site2_list + ret_list
    rng.shuffle(all_microbes)

    ambiguous_ids: List[str] = []
    ambiguous = False
    for i, m in enumerate(all_microbes, start=1):
        mid = f"M{i:03d}"
        m["id"] = mid
        if m in site1_list and satisfies_revealed(m, revealed):
            ambiguous = True
            ambiguous_ids.append(mid)

    # Remap correct_categorization with real ids
    def key_of(m: Dict[str, Any]) -> str:
        return repr(microbe_attrs(m))

    lookup = {key_of(m): m["id"] for m in all_microbes}
    out_correct: Dict[str, List[Dict[str, str]]] = {"site1": [], "site2": [], "return": []}
    for entry in correct["site1"]:
        out_correct["site1"].append({"id": lookup[entry["key"]], "reason": entry["reason"]})
    for entry in correct["site2"]:
        out_correct["site2"].append({"id": lookup[entry["key"]], "reason": entry["reason"]})
    for entry in correct["return"]:
        out_correct["return"].append({"id": lookup[entry["key"]], "reason": entry["reason"]})

    pool_obj_microbes: List[Dict[str, Any]] = []
    for m in all_microbes:
        pool_obj_microbes.append(
            {
                "id": m["id"],
                "name": m["name"],
                "Mobility": m["Mobility"],
                "Agility": m["Agility"],
                "Size": m["Size"],
                "trait": m["trait"],
            }
        )

    return pool_obj_microbes, out_correct, ambiguous, ambiguous_ids


def valid_ordered_pairs(scenarios: Sequence[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any]]]:
    out: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []
    for s1 in scenarios:
        if int(s1["id"]) == HADAL_ID:
            continue
        for s2 in scenarios:
            if s1 is s2 or s1["id"] == s2["id"]:
                continue
            if s1["desired_trait"] == s2["desired_trait"]:
                continue
            if not pair_has_disjoint_attribute(s1, s2):
                continue
            out.append((s1, s2))
    return out


def site1_fitness_for_validation(microbe: Dict[str, Any], site1: Dict[str, Any]) -> bool:
    """CHECK 3: desired trait OR extreme attr in range OR 2+ in range with third close."""
    if str(microbe["trait"]) == str(site1["desired_trait"]):
        return True
    if site1_branch_b(microbe, site1):
        return True
    if site1_branch_c(microbe, site1):
        return True
    return False


def validate_pool(pool: Dict[str, Any]) -> List[Tuple[int, str]]:
    """Run CHECK 1–10; return list of (check_number, reason)."""
    errors: List[Tuple[int, str]] = []

    def add(check: int, msg: str) -> None:
        errors.append((check, msg))

    site1_req = pool.get("site1_requirements")
    site2_req = pool.get("site2_requirements")
    revealed = pool.get("revealed_characteristic")
    microbes = pool.get("microbes")
    correct = pool.get("correct_categorization")
    site1_name = pool.get("site1_scenario")
    site2_name = pool.get("site2_scenario")
    a_field = pool.get("a")
    b_field = pool.get("b")
    c_field = pool.get("c")
    ambiguous = pool.get("ambiguous", False)
    amb_ids = pool.get("ambiguous_microbe_ids")

    ids1: List[str] = []
    ids2: List[str] = []
    ids_r: List[str] = []
    if isinstance(correct, dict):
        for e in correct.get("site1") or []:
            if isinstance(e, dict) and isinstance(e.get("id"), str):
                ids1.append(e["id"])
        for e in correct.get("site2") or []:
            if isinstance(e, dict) and isinstance(e.get("id"), str):
                ids2.append(e["id"])
        for e in correct.get("return") or []:
            if isinstance(e, dict) and isinstance(e.get("id"), str):
                ids_r.append(e["id"])

    by_id: Dict[str, Dict[str, Any]] = {}
    if isinstance(microbes, list):
        for m in microbes:
            if isinstance(m, dict) and isinstance(m.get("id"), str):
                by_id[m["id"]] = m

    # CHECK 1 — MICROBE COUNT
    if not isinstance(microbes, list):
        add(1, "microbes must be a list")
    else:
        if len(microbes) != 10:
            add(1, f"expected exactly 10 microbes, got {len(microbes)}")
        raw_ids: List[str] = []
        for m in microbes:
            if not isinstance(m, dict):
                add(1, "every microbe must be an object")
                continue
            mid = m.get("id")
            if not isinstance(mid, str):
                add(1, "every microbe must have a string id")
            else:
                raw_ids.append(mid)
        if len(raw_ids) == 10 and len(set(raw_ids)) != 10:
            c = Counter(raw_ids)
            dup = sorted([k for k, v in c.items() if v > 1])
            add(1, f"duplicate microbe id(s) in microbes: {', '.join(dup)}")

    if len(ids1) + len(ids2) + len(ids_r) != 10:
        add(
            1,
            f"category id counts must sum to 10, got site1={len(ids1)} site2={len(ids2)} return={len(ids_r)}",
        )

    # CHECK 2 — CORRECT CATEGORIZATION IDs
    if not isinstance(correct, dict):
        add(2, "correct_categorization must be an object")
    elif isinstance(microbes, list):
        cat_all = ids1 + ids2 + ids_r
        if len(set(ids1)) != len(ids1):
            add(2, "duplicate id in site1 category")
        if len(set(ids2)) != len(ids2):
            add(2, "duplicate id in site2 category")
        if len(set(ids_r)) != len(ids_r):
            add(2, "duplicate id in return category")
        cross = (set(ids1) & set(ids2)) | (set(ids1) & set(ids_r)) | (set(ids2) & set(ids_r))
        if cross:
            add(2, f"id(s) appear in multiple categories: {', '.join(sorted(cross))}")
        pool_ids = {m.get("id") for m in microbes if isinstance(m, dict) and isinstance(m.get("id"), str)}
        cat_set = set(cat_all)
        missing_in_microbes = cat_set - pool_ids
        if missing_in_microbes:
            add(2, f"categorization id(s) missing from microbes: {', '.join(sorted(missing_in_microbes))}")
        extra_in_microbes = pool_ids - cat_set
        if extra_in_microbes:
            add(2, f"microbe id(s) not in correct_categorization: {', '.join(sorted(extra_in_microbes))}")
        if len(cat_set) != len(cat_all):
            add(2, "categorization id list length mismatch with unique ids")
        if len(pool_ids) == 10 and len(cat_set) == 10 and pool_ids != cat_set:
            add(2, "microbe ids and categorization ids sets differ")

    # CHECK 3 — SITE 1 MICROBE RULES
    if isinstance(site1_req, dict) and isinstance(site2_req, dict):
        for mid in ids1:
            m = by_id.get(mid)
            if m is None:
                add(3, f"site1 id {mid!r} not found in microbes")
                continue
            if str(m.get("trait")) == str(site1_req.get("undesired_trait")):
                add(3, f"site1 microbe {mid} has site1 undesired trait")
            if inviable_for_site(m, site1_req):
                add(3, f"site1 microbe {mid} is inviable for site1")
            if str(m.get("trait")) == str(site2_req.get("undesired_trait")):
                add(3, f"site1 microbe {mid} has site2 undesired trait")
            if not site1_fitness_for_validation(m, site1_req):
                add(3, f"site1 microbe {mid} fails fitness (desired / extreme-in-range / 2+ close)")
    else:
        add(3, "site1_requirements and site2_requirements must be objects for site1 rules")

    # CHECK 4 — SITE 2 MICROBE RULES
    if not isinstance(revealed, dict):
        add(4, "revealed_characteristic required for site2 rules")
    elif isinstance(site1_req, dict) and isinstance(site2_req, dict):
        for mid in ids2:
            m = by_id.get(mid)
            if m is None:
                add(4, f"site2 id {mid!r} not found in microbes")
                continue
            try:
                if not satisfies_revealed(m, revealed):
                    add(4, f"site2 microbe {mid} does not satisfy revealed characteristic")
            except Exception as e:
                add(4, f"site2 microbe {mid} revealed check error: {e}")
            if str(m.get("trait")) == str(site2_req.get("undesired_trait")):
                add(4, f"site2 microbe {mid} has site2 undesired trait")
            if not (
                inviable_for_site(m, site1_req)
                or str(m.get("trait")) == str(site1_req.get("undesired_trait"))
                or attributes_in_range_count(m, site1_req) <= 1
            ):
                add(4, f"site2 microbe {mid} fails site1 exclusion rule")
    else:
        add(4, "site1_requirements and site2_requirements must be objects for site2 rules")

    # CHECK 5 — RETURN MICROBE RULES
    if not isinstance(revealed, dict):
        add(5, "revealed_characteristic required for return rules")
    elif isinstance(site1_req, dict):
        for mid in ids_r:
            m = by_id.get(mid)
            if m is None:
                add(5, f"return id {mid!r} not found in microbes")
                continue
            try:
                if satisfies_revealed(m, revealed):
                    add(5, f"return microbe {mid} must not satisfy revealed characteristic")
            except Exception as e:
                add(5, f"return microbe {mid} revealed check error: {e}")
            if not (
                inviable_for_site(m, site1_req)
                or str(m.get("trait")) == str(site1_req.get("undesired_trait"))
                or attributes_in_range_count(m, site1_req) == 0
            ):
                add(5, f"return microbe {mid} fails return eligibility rule")
    else:
        add(5, "site1_requirements must be an object for return rules")

    # CHECK 6 — REVEALED CHARACTERISTIC VALIDITY
    u2_trait = site2_req.get("undesired_trait") if isinstance(site2_req, dict) else None
    if not isinstance(revealed, dict):
        add(6, "revealed_characteristic must be an object")
    else:
        rtype = revealed.get("type")
        if rtype not in ("trait", "attribute"):
            add(6, f'revealed.type must be "trait" or "attribute", got {rtype!r}')
        elif rtype == "trait":
            val = revealed.get("value")
            if val not in TRAITS:
                add(6, f"revealed trait value must be one of {TRAITS}, got {val!r}")
            if u2_trait is not None and str(val) == str(u2_trait):
                add(6, "revealed characteristic must not be site2.undesired_trait")
        elif rtype == "attribute":
            name = revealed.get("name")
            if name not in ATTRIBUTES:
                add(6, f"revealed attribute name must be one of {ATTRIBUTES}, got {name!r}")
            val = revealed.get("value")
            if not isinstance(val, dict):
                add(6, "revealed attribute value must be an object with min/max")
            elif isinstance(site2_req, dict):
                attrs2 = site2_req.get("attributes") or {}
                exp = attrs2.get(name) if name in ATTRIBUTES else None
                if not isinstance(exp, dict):
                    add(6, f"site2 has no requirements for attribute {name!r}")
                else:
                    try:
                        rmin, rmax = int(val["min"]), int(val["max"])
                        emin, emax = int(exp["min"]), int(exp["max"])
                        if (rmin, rmax) != (emin, emax):
                            add(
                                6,
                                f"revealed range for {name} ({rmin}-{rmax}) does not match site2 ({emin}-{emax})",
                            )
                    except (KeyError, TypeError, ValueError) as e:
                        add(6, f"invalid revealed or site2 attribute bounds: {e}")

    # CHECK 7 — A/B/C COUNTS
    if not isinstance(a_field, int) or not isinstance(b_field, int) or not isinstance(c_field, int):
        add(7, f"a, b, c must be integers, got a={a_field!r} b={b_field!r} c={c_field!r}")
    else:
        if a_field not in (1, 2, 3):
            add(7, f"a must be in [1,3], got {a_field}")
        if b_field not in (1, 2, 3):
            add(7, f"b must be in [1,3], got {b_field}")
        if c_field < 1:
            add(7, f"c must be >= 1, got {c_field}")
        if a_field + b_field + c_field != 10:
            add(7, f"a+b+c must equal 10, got {a_field}+{b_field}+{c_field}")
        if c_field != 10 - a_field - b_field:
            add(7, f"c must equal 10-a-b, got c={c_field} vs 10-a-b={10 - a_field - b_field}")
        if a_field != len(ids1):
            add(7, f"a ({a_field}) must equal len(site1 ids) ({len(ids1)})")
        if b_field != len(ids2):
            add(7, f"b ({b_field}) must equal len(site2 ids) ({len(ids2)})")
        if c_field != len(ids_r):
            add(7, f"c ({c_field}) must equal len(return ids) ({len(ids_r)})")

    # CHECK 8 — AMBIGUITY FLAG CONSISTENCY
    if not isinstance(amb_ids, list):
        add(8, "ambiguous_microbe_ids must be a list")
    else:
        norm_amb = [x for x in amb_ids if isinstance(x, str)]
        if ambiguous:
            if not norm_amb:
                add(8, "ambiguous True requires non-empty ambiguous_microbe_ids")
            site1_set = set(ids1)
            for aid in amb_ids:
                if not isinstance(aid, str):
                    add(8, f"ambiguous_microbe_ids must contain only strings, got {aid!r}")
                    continue
                if aid not in site1_set:
                    add(8, f"ambiguous id {aid!r} is not in site1 category")
                m = by_id.get(aid)
                if m is None:
                    add(8, f"ambiguous id {aid!r} not found in microbes")
                    continue
                if isinstance(revealed, dict):
                    try:
                        if not satisfies_revealed(m, revealed):
                            add(8, f"ambiguous id {aid} must satisfy revealed characteristic")
                    except Exception as e:
                        add(8, f"error checking revealed for ambiguous id {aid}: {e}")
        else:
            if norm_amb:
                add(8, f"ambiguous False requires empty ambiguous_microbe_ids, got {norm_amb!r}")

    # CHECK 9 — SCENARIO PAIR VALIDITY
    if site1_name == "Hadal Abyss":
        add(9, "site1_scenario cannot be Hadal Abyss")
    if not isinstance(site1_name, str) or not isinstance(site2_name, str):
        add(9, "site1_scenario and site2_scenario must be strings")
    elif site1_name == site2_name:
        add(9, "site1_scenario must differ from site2_scenario")
    if not isinstance(site1_req, dict) or not isinstance(site2_req, dict):
        add(9, "site1_requirements and site2_requirements must be objects")
    else:
        d1, d2 = site1_req.get("desired_trait"), site2_req.get("desired_trait")
        if d1 is not None and d2 is not None and d1 == d2:
            add(9, "site1 desired_trait equals site2 desired_trait")
        try:
            if not pair_has_disjoint_attribute(site1_req, site2_req):
                add(
                    9,
                    "all 3 attribute ranges overlap between site1 and site2 (need at least one non-overlapping)",
                )
        except (KeyError, TypeError, ValueError) as e:
            add(9, f"could not verify attribute range overlap: {e}")

    # CHECK 10 — REASON STRINGS
    if not isinstance(correct, dict):
        add(10, "correct_categorization must be an object")
    else:
        for cat in ("site1", "site2", "return"):
            for e in correct.get(cat) or []:
                if not isinstance(e, dict):
                    add(10, f"entry in {cat} is not an object")
                    continue
                mid = e.get("id")
                reason = e.get("reason")
                if not isinstance(reason, str) or not reason.strip():
                    add(10, f"reason for id {mid!r} in {cat} must be a non-empty string")
                elif len(reason.strip()) <= 10:
                    add(10, f"reason for id {mid!r} in {cat} must be longer than 10 characters")

    return errors


def generate_pool_with_retries(
    site1: Dict[str, Any],
    site2: Dict[str, Any],
    pool_index: int,
    rng: random.Random,
) -> Optional[Dict[str, Any]]:
    slug1 = slugify(site1["name"])
    slug2 = slugify(site2["name"])
    cid = f"{slug1}__{slug2}__{pool_index:02d}"

    revealed = pick_revealed_characteristic(site2, rng)

    for split_attempt in range(3):
        a = rng_int(rng, 1, 3)
        b = rng_int(rng, 1, 3)
        c = 10 - a - b
        if c < 1:
            continue

        generated = try_generate_pool(site1, site2, revealed, a, b, c, rng)
        if generated is None:
            continue

        microbes, correct_categorization, ambiguous, ambiguous_microbe_ids = generated

        return {
            "categorization_id": cid,
            "site1_scenario": site1["name"],
            "site2_scenario": site2["name"],
            "site1_requirements": build_site_requirements(site1),
            "site2_requirements": build_site_requirements(site2),
            "revealed_characteristic": {
                k: json.loads(json.dumps(v)) if isinstance(v, dict) else v
                for k, v in revealed.items()
            },
            "microbes": microbes,
            "correct_categorization": correct_categorization,
            "a": a,
            "b": b,
            "c": c,
            "ambiguous": ambiguous,
            "ambiguous_microbe_ids": ambiguous_microbe_ids,
        }

    print(
        f"FAIL: skipped pool after 3 failed a/b splits for "
        f"{site1['name']}__{site2['name']} pool_index={pool_index}"
    )
    return None


def main() -> None:
    t0 = time.perf_counter()
    here = pathlib.Path(__file__).resolve().parent
    scenarios_path = here / "scenarios.json"
    out_path = here / "categorization_pools.json"

    with scenarios_path.open(encoding="utf-8") as f:
        data = json.load(f)
    scenarios = data["scenarios"]

    pairs = valid_ordered_pairs(scenarios)
    rng = random.Random()

    output: Dict[str, List[Dict[str, Any]]] = {}
    pools_ok = 0
    pools_fail = 0
    ambiguous_report: List[str] = []

    for s1, s2 in pairs:
        key = f"{s1['name']}__{s2['name']}"
        bucket: List[Dict[str, Any]] = []
        for i in range(1, POOLS_PER_PAIR + 1):
            pool = generate_pool_with_retries(s1, s2, i, rng)
            if pool is None:
                pools_fail += 1
                continue
            bucket.append(pool)
            pools_ok += 1
            if pool["ambiguous"]:
                ambiguous_report.append(str(pool["categorization_id"]))
        output[key] = bucket

    flat_pools: List[Dict[str, Any]] = [p for lst in output.values() for p in lst]
    breakdown: Dict[int, int] = defaultdict(int)
    pools_validated = len(flat_pools)
    pools_passed = 0
    pools_failed_val = 0

    for pool in flat_pools:
        cid = str(pool.get("categorization_id", "(missing categorization_id)"))
        issues = validate_pool(pool)
        if issues:
            pools_failed_val += 1
            pool["validation_failed"] = True
            pool["validation_errors"] = [f"CHECK {n}: {msg}" for n, msg in issues]
            for n, msg in issues:
                breakdown[n] += 1
                print(f"[VALIDATION FAIL] categorization_id={cid} check={n} reason={msg}")
        else:
            pools_passed += 1
            pool["validation_failed"] = False
            pool["validation_errors"] = []

    print("--- Self-validation ---")
    print(f"Total pools validated: {pools_validated}")
    print(f"Total passed: {pools_passed}")
    print(f"Total failed: {pools_failed_val}")
    print("Failures by check number:")
    for check_no in range(1, 11):
        count = breakdown.get(check_no, 0)
        print(f"  CHECK {check_no}: {count}")

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    elapsed = time.perf_counter() - t0
    print(f"Total valid pairs found: {len(pairs)}")
    print(f"Total pools generated successfully: {pools_ok}")
    print(f"Total pools failed: {pools_fail}")
    print(f"Total ambiguous pools: {len(ambiguous_report)}")
    if ambiguous_report:
        print("Ambiguous pool ids:")
        for aid in ambiguous_report:
            print(f"  - {aid}")
    print(f"Time taken: {elapsed:.4f}s")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
