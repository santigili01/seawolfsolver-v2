#!/usr/bin/env python3
"""
generate_pools.py (v3 — adversarial human-difficulty model)

Tier structure:
  easy:   max_score=100, count=1, low decoy density (H in [15,40])
  medium: max_score=80,  count=1, moderate decoy density (H in [35,60])
  hard:   max_score=80,  count=1, high heuristic resistance (H in [55,75])
  expert: max_score=60,  count<=2 (H in [50,75])
  hadal:  max_score in {80,60}, count<=2, H>=80, brutal across all dimensions
          — 2 pools per non-Hadal-Abyss scenario, 10 pools for Hadal Abyss

Key changes from v2:
  - Adversarial generation: build pools from planned components rather than
    rejection sampling random pools
  - 7-factor human difficulty model (heuristic resistance is primary)
  - Heuristic bots inform difficulty scoring
  - Hard tier uses max_score=80 with high deception, not max_score=60
  - Expert tier: max_score=60, count<=2
  - Hadal available on all scenarios
"""

import json
import random
import itertools
from pathlib import Path
from typing import Optional
from statistics import mean

import numpy as np

# ── Name components ────────────────────────────────────────────────────────────
PREFIXES = [
    "Cyro", "Thermo", "Hydro", "Bio", "Aero", "Ferro", "Chromo", "Nano",
    "Macro", "Micro", "Aqua", "Terra", "Pyro", "Cryo", "Photo", "Geo",
    "Chemo", "Halo", "Nitro", "Sulfo",
]
SUFFIXES = [
    "Amoeba", "Bacillus", "Coccus", "Spirillum", "Vibrio", "Proteus",
    "Phage", "Zoan", "Morph", "Plasm", "Cyte", "Spore", "Bacter",
    "Cocci", "Myces", "Flagella", "Pilus", "Capsid", "Soma", "Filum",
]

TRAITS     = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES = ["Mobility", "Agility", "Size"]

# Tier targets: (count, pools_per_non_hadal_scenario, pools_for_hadal_abyss)
TIER_CONFIGS = {
    "easy":   {"max_score": 100, "max_count": 1, "target": 15, "H_range": (15, 40)},
    "medium": {"max_score": 80,  "max_count": 1, "target": 10, "H_range": (35, 60)},
    "hard":   {"max_score": 80,  "max_count": 1, "target": 5,  "H_range": (55, 75)},
    "expert": {"max_score": 60,  "max_count": 2, "target": 5,  "H_range": (40, 70)},
}
HADAL_ABYSS_TARGET = 10
MAX_ADVERSARIAL_ATTEMPTS = 200   # per pool
MAX_FALLBACK_ATTEMPTS    = 50_000

COMBO_IDX = np.array(
    list(itertools.combinations(range(10), 3)), dtype=np.int32
)  # (120, 3)


# ── Core scoring ───────────────────────────────────────────────────────────────

def score_combo_list(trio: list, scenario: dict) -> int:
    score = 100
    for j, attr in enumerate(ATTRIBUTES):
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        mean_val = sum(m[attr] for m in trio) / 3.0
        if not (lo <= mean_val <= hi):
            score -= 20
    traits = {m["trait"] for m in trio}
    if scenario["desired_trait"] not in traits:
        score -= 20
    if scenario["undesired_trait"] in traits:
        score -= 20
    return score


def score_all_combos_list(microbes: list, scenario: dict) -> np.ndarray:
    attrs  = np.array([[m["Mobility"], m["Agility"], m["Size"]] for m in microbes],
                      dtype=np.float32)
    traits = np.array([TRAITS.index(m["trait"]) for m in microbes], dtype=np.int32)
    d_idx  = TRAITS.index(scenario["desired_trait"])
    u_idx  = TRAITS.index(scenario["undesired_trait"])

    combo_attrs = attrs[COMBO_IDX]             # (120, 3, 3)
    means       = combo_attrs.mean(axis=1)     # (120, 3)

    scores = np.full(120, 100, dtype=np.int32)
    for j, attr in enumerate(ATTRIBUTES):
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        out = (means[:, j] < lo) | (means[:, j] > hi)
        scores -= 20 * out.astype(np.int32)

    combo_traits  = traits[COMBO_IDX]                            # (120, 3)
    no_desired    = ~np.any(combo_traits == d_idx, axis=1)
    has_undesired =  np.any(combo_traits == u_idx, axis=1)
    scores -= 20 * no_desired.astype(np.int32)
    scores -= 20 * has_undesired.astype(np.int32)

    return scores


def is_inviable(val: int, lo: int, hi: int) -> bool:
    return val + 10 + 10 < 3 * lo or val + 1 + 1 > 3 * hi


def has_inviable_attribute(m: dict, scenario: dict) -> bool:
    for attr in ATTRIBUTES:
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if is_inviable(m[attr], lo, hi):
            return True
    return False


# ── Attribute quality helpers ──────────────────────────────────────────────────

def attribute_quality_score(m: dict, scenario: dict) -> float:
    """How well do this microbe's attributes individually fit the site (0-6)?"""
    score = 0.0
    for attr in ATTRIBUTES:
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        val = m[attr]
        if lo <= val <= hi:
            score += 2
        elif val == lo - 1 or val == hi + 1:
            score += 1
    return score


def plausible_value(lo: int, hi: int, zone: int = 3) -> int:
    vals = list(range(max(1, lo - zone), min(10, hi + zone) + 1))
    return random.choice(vals)


def tight_plausible_value(lo: int, hi: int) -> int:
    return plausible_value(lo, hi, zone=2)


def in_range_value(lo: int, hi: int) -> int:
    return random.randint(lo, hi)


def make_name() -> str:
    return f"{random.choice(PREFIXES)} {random.choice(SUFFIXES)}"


def make_microbe(attrs: list, trait: str) -> dict:
    return {
        "id":       "",   # assigned after pool is assembled
        "name":     make_name(),
        "Mobility": attrs[0],
        "Agility":  attrs[1],
        "Size":     attrs[2],
        "trait":    trait,
    }


def assign_ids(microbes: list) -> list:
    for i, m in enumerate(microbes):
        m["id"] = f"M{i+1:03d}"
    return microbes


# ── Heuristic bots ─────────────────────────────────────────────────────────────

def bot_greedy_anchor(microbes: list, scenario: dict) -> int:
    """Best desired-trait microbe + 2 best by attribute quality."""
    desired = [m for m in microbes if m["trait"] == scenario["desired_trait"]
               and not has_inviable_attribute(m, scenario)]
    others  = [m for m in microbes if m["trait"] != scenario["undesired_trait"]
               and not has_inviable_attribute(m, scenario)]

    if not desired:
        pool = sorted(others, key=lambda m: attribute_quality_score(m, scenario),
                      reverse=True)[:3]
    else:
        anchor = max(desired, key=lambda m: attribute_quality_score(m, scenario))
        fillers = sorted([m for m in others if m["id"] != anchor["id"]],
                         key=lambda m: attribute_quality_score(m, scenario),
                         reverse=True)[:2]
        pool = [anchor] + fillers

    if len(pool) < 3:
        return 0
    return score_combo_list(pool, scenario)


def bot_attribute_maximizer(microbes: list, scenario: dict) -> int:
    """Top 3 by attribute quality, avoiding undesired trait."""
    candidates = [m for m in microbes if m["trait"] != scenario["undesired_trait"]]
    if len(candidates) < 3:
        candidates = microbes
    top3 = sorted(candidates,
                  key=lambda m: attribute_quality_score(m, scenario),
                  reverse=True)[:3]
    return score_combo_list(top3, scenario)


def bot_trait_first(microbes: list, scenario: dict) -> int:
    """All desired-trait if possible, else best attributes."""
    desired = [m for m in microbes if m["trait"] == scenario["desired_trait"]]
    if len(desired) >= 3:
        top3 = sorted(desired,
                      key=lambda m: attribute_quality_score(m, scenario),
                      reverse=True)[:3]
        return score_combo_list(top3, scenario)
    return bot_attribute_maximizer(microbes, scenario)


def bot_balanced(microbes: list, scenario: dict) -> int:
    """
    Enumerate all combos with at least 1 desired-trait microbe,
    no undesired-trait microbe, return best score found.
    """
    desired_idx   = [i for i, m in enumerate(microbes)
                     if m["trait"] == scenario["desired_trait"]]
    undesired_idx = {i for i, m in enumerate(microbes)
                     if m["trait"] == scenario["undesired_trait"]}
    best = 0
    for combo in COMBO_IDX:
        if any(i in undesired_idx for i in combo):
            continue
        if not any(i in desired_idx for i in combo):
            continue
        trio  = [microbes[i] for i in combo]
        score = score_combo_list(trio, scenario)
        if score > best:
            best = score
    return best


def best_bot_score(microbes: list, scenario: dict) -> int:
    return max(
        bot_greedy_anchor(microbes, scenario),
        bot_attribute_maximizer(microbes, scenario),
        bot_trait_first(microbes, scenario),
        bot_balanced(microbes, scenario),
    )


# ── Human difficulty model ─────────────────────────────────────────────────────

def _heuristic_resistance(microbes, scenario, optimal_combo, max_score) -> float:
    """0-10: how badly does the best bot strategy fail vs optimal?"""
    bot_best = best_bot_score(microbes, scenario)
    gap      = max_score - bot_best
    # gap=0  → bot finds optimal → score 0
    # gap=20 → one condition off  → score 5
    # gap=40 → two conditions off → score 10
    return min(10.0, gap / 4.0)


def _decoy_density(combo_scores: np.ndarray, max_score: int) -> float:
    """0-10: how many near-optimal combos exist?"""
    decoy_count = int(np.sum(combo_scores >= max_score - 20)) - 1
    decoy_count = max(0, decoy_count)
    if decoy_count == 0:  return 0.0
    if decoy_count <= 2:  return 3.0
    if decoy_count <= 5:  return 5.0
    if decoy_count <= 10: return 7.0
    if decoy_count <= 20: return 8.5
    return 10.0


def _effective_pool_size(microbes: list, scenario: dict) -> float:
    """0-10: how many microbes survive naive triage?"""
    survivors = 0
    for m in microbes:
        if has_inviable_attribute(m, scenario):
            continue
        if m["trait"] == scenario["undesired_trait"]:
            continue
        all_in_range = all(
            scenario["attributes"][a]["min"] <= m[a] <= scenario["attributes"][a]["max"]
            for a in ATTRIBUTES
        )
        if all_in_range or m["trait"] == scenario["desired_trait"]:
            survivors += 1
    if survivors <= 3: return 0.0
    if survivors <= 5: return 3.0
    if survivors <= 7: return 6.0
    if survivors <= 9: return 8.5
    return 10.0


def _win_margin(combo_scores: np.ndarray, max_score: int) -> float:
    """0-10: how precise must the player be? Small margin = harder."""
    sorted_scores = np.sort(combo_scores)[::-1]
    second_best   = int(sorted_scores[1]) if len(sorted_scores) > 1 else 0
    margin        = max_score - second_best
    if margin >= 40: return 0.0
    if margin == 20: return 5.0
    if margin == 0:  return 10.0
    return 7.0


def _cognitive_load(microbes: list, scenario: dict) -> float:
    """0-10: microbes requiring calculation (plausible, not inviable, not undesired)."""
    load = 0
    for m in microbes:
        if has_inviable_attribute(m, scenario):
            continue
        if m["trait"] == scenario["undesired_trait"]:
            continue
        near_boundary = all(
            scenario["attributes"][a]["min"] - 2 <= m[a] <=
            scenario["attributes"][a]["max"] + 2
            for a in ATTRIBUTES
        )
        if near_boundary:
            load += 1
    return min(10.0, load * 1.25)


def _trait_trap_intensity(
    microbes: list, scenario: dict, optimal_combo: list
) -> float:
    """0-10: how strong are trait-based traps?"""
    score        = 0.0
    desired_ms   = [m for m in microbes if m["trait"] == scenario["desired_trait"]]
    undesired_ms = [m for m in microbes if m["trait"] == scenario["undesired_trait"]]

    if undesired_ms:
        avg_u = mean(attribute_quality_score(m, scenario) for m in undesired_ms)
        if desired_ms:
            avg_d = mean(attribute_quality_score(m, scenario) for m in desired_ms)
            if avg_u > avg_d:
                score += min(4.0, avg_u - avg_d)
        else:
            score += 4.0

    if desired_ms:
        all_flawed = all(
            any(
                m[a] < scenario["attributes"][a]["min"] - 1 or
                m[a] > scenario["attributes"][a]["max"] + 1
                for a in ATTRIBUTES
            )
            for m in desired_ms
        )
        if all_flawed:
            score += 3.0

    opt_traits = {m["trait"] for m in optimal_combo}
    if scenario["desired_trait"] not in opt_traits:
        score += 3.0

    return min(10.0, score)


def _anchor_ambiguity(
    microbes: list, scenario: dict, combo_scores: np.ndarray, max_score: int
) -> float:
    """0-10: how many plausible anchor candidates exist?"""
    viable_anchors = 0
    for i, m in enumerate(microbes):
        if m["trait"] != scenario["desired_trait"]:
            continue
        if has_inviable_attribute(m, scenario):
            continue
        combos_with_m = [ci for ci, triple in enumerate(COMBO_IDX) if i in triple]
        best_with_m   = max(int(combo_scores[ci]) for ci in combos_with_m)
        if best_with_m >= max_score - 20:
            viable_anchors += 1
    if viable_anchors <= 1: return 2.0
    if viable_anchors == 2: return 6.0
    return 10.0


def compute_human_difficulty(
    microbes: list,
    combo_scores: np.ndarray,
    max_score: int,
    scenario: dict,
) -> dict:
    best_ci       = int(np.where(combo_scores == max_score)[0][0])
    optimal_combo = [microbes[i] for i in COMBO_IDX[best_ci]]

    hr  = _heuristic_resistance(microbes, scenario, optimal_combo, max_score)
    dd  = _decoy_density(combo_scores, max_score)
    eps = _effective_pool_size(microbes, scenario)
    wm  = _win_margin(combo_scores, max_score)
    cl  = _cognitive_load(microbes, scenario)
    tt  = _trait_trap_intensity(microbes, scenario, optimal_combo)
    aa  = _anchor_ambiguity(microbes, scenario, combo_scores, max_score)

    H_raw = (
        hr  * 0.25
        + dd  * 0.20
        # + eps * 0.15
        + wm  * 0.15
        + cl  * 0.10
        + tt  * 0.10
        + aa  * 0.05
    )
    H = min(100.0, H_raw * 10.0)

    # Legacy fields for JSON schema compatibility
    desired_in_opt  = scenario["desired_trait"] in {m["trait"] for m in optimal_combo}
    undesired_in_opt = scenario["undesired_trait"] in {m["trait"] for m in optimal_combo}
    near_miss_count = max(0, int(np.sum(combo_scores >= max_score - 20)) - 1)

    if H < 26:   band = "beginner"
    elif H < 46: band = "intermediate"
    elif H < 66: band = "advanced"
    elif H < 81: band = "expert"
    else:        band = "hadal"

    return {
        "H":                  round(H, 1),
        "heuristic_resistance": round(hr, 2),
        "decoy_density":        round(dd, 2),
        "effective_pool_size":  round(eps, 2),
        "win_margin":           round(wm, 2),
        "cognitive_load":       round(cl, 2),
        "trait_trap_intensity": round(tt, 2),
        "anchor_ambiguity":     round(aa, 2),
        "difficulty_band":      band,
        "near_miss_count":      near_miss_count,
        "desired_trap":         not desired_in_opt,
        "undesired_bait":       undesired_in_opt,
    }


# ── Classification ─────────────────────────────────────────────────────────────

def classify_pool(
    max_score: int,
    count: int,
    hd: dict,
    tier: str,
) -> bool:
    cfg = TIER_CONFIGS[tier]
    H   = hd["H"]
    H_lo, H_hi = cfg["H_range"]

    if count > cfg["max_count"]:
        return False
    if not (H_lo <= H <= H_hi):
        return False

    if tier == "easy":
        if max_score != 100: return False
        if hd["decoy_density"] > 4: return False

    elif tier == "medium":
        if max_score != 80:  return False

    elif tier == "hard":
        if max_score != 80:  return False
        if hd["heuristic_resistance"] < 6: return False
        if hd["decoy_density"] < 5:        return False

    elif tier == "expert":
        if max_score != 60:  return False

    elif tier == "hadal":
        if max_score not in (80, 60):       return False
        if hd["heuristic_resistance"] < 6:  return False  # was 7
        if hd["decoy_density"] < 6:         return False  # was 7
        if hd["effective_pool_size"] < 5:   return False  # was 7
        if hd["trait_trap_intensity"] < 5:  return False  # was 6
        if H < 75:                          return False  # was 80

    return True


# ── Adversarial pool construction ──────────────────────────────────────────────

def build_optimal_triple(
    scenario: dict,
    target_max: int,
    tier: str,
) -> list:
    """
    Build 3 microbes that, combined, achieve target_max score.
    For hard tier: optimal triple deliberately lacks desired trait.
    """
    d_trait = scenario["desired_trait"]
    u_trait = scenario["undesired_trait"]
    other_traits = [t for t in TRAITS if t != u_trait]

    for _ in range(500):
        microbes = []
        for k in range(3):
            attrs = [in_range_value(
                         scenario["attributes"][a]["min"],
                         scenario["attributes"][a]["max"]
                     ) for a in ATTRIBUTES]
            if tier == "hard":
                # Hard: optimal triple has NO desired trait
                trait = random.choice([t for t in TRAITS
                                       if t != d_trait and t != u_trait])
            elif target_max == 100:
                # Easy: at least one desired, none undesired
                if k == 0:
                    trait = d_trait
                else:
                    trait = random.choice([t for t in TRAITS if t != u_trait])
            else:
                # Medium/expert: mixed, no undesired
                trait = random.choice([t for t in TRAITS if t != u_trait])
            microbes.append(make_microbe(attrs, trait))

        s = score_combo_list(microbes, scenario)
        if s == target_max:
            return microbes
    return []


def build_trait_trap(scenario: dict, intensity: str = "strong") -> dict:
    """Undesired-trait microbe with attractive attributes."""
    attrs = []
    for attr in ATTRIBUTES:
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if intensity == "strong":
            attrs.append(random.choice([lo, lo + 1, hi - 1, hi]))
        else:
            attrs.append(plausible_value(lo, hi))
    return make_microbe(attrs, scenario["undesired_trait"])


def build_flawed_desired_anchor(scenario: dict) -> dict:
    """
    Desired-trait microbe that looks like a great anchor but has one
    attribute just outside range — forces heuristic bot to pick it
    but it actually hurts the mean.
    """
    for _ in range(200):
        attrs = []
        flaw_attr = random.randint(0, 2)
        for j, attr in enumerate(ATTRIBUTES):
            lo = scenario["attributes"][attr]["min"]
            hi = scenario["attributes"][attr]["max"]
            if j == flaw_attr:
                # One step outside range in a random direction
                if random.random() < 0.5:
                    val = max(1, lo - random.randint(1, 2))
                else:
                    val = min(10, hi + random.randint(1, 2))
                attrs.append(val)
            else:
                # Other attributes in range
                attrs.append(in_range_value(lo, hi))
        return make_microbe(attrs, scenario["desired_trait"])
    return None


def build_averaging_trap(scenario: dict, optimal_triple: list) -> Optional[dict]:
    """
    Microbe individually in-range on all attributes but hurts every
    combination it joins.
    """
    for _ in range(300):
        attrs = []
        for attr in ATTRIBUTES:
            lo = scenario["attributes"][attr]["min"]
            hi = scenario["attributes"][attr]["max"]
            # Pick at range boundary — looks good individually
            attrs.append(random.choice([lo, hi]))
        trait = random.choice([t for t in TRAITS
                                if t != scenario["undesired_trait"]])
        m = make_microbe(attrs, trait)

        # Verify it's individually in-range
        individually_ok = all(
            scenario["attributes"][a]["min"] <= m[a] <=
            scenario["attributes"][a]["max"]
            for a in ATTRIBUTES
        )
        if not individually_ok:
            continue

        # Verify it hurts every combo it joins with the optimal triple
        is_trap = True
        for i in range(3):
            sub = [optimal_triple[j] for j in range(3) if j != i] + [m]
            if score_combo_list(sub, scenario) >= score_combo_list(
                optimal_triple, scenario
            ):
                is_trap = False
                break
        if is_trap:
            return m
    return None


def build_obvious_decoy_microbe(
    scenario: dict,
    optimal_triple: list,
    target_score: int,
) -> Optional[dict]:
    """
    Build a microbe that when combined with 2 of the optimal triple scores
    exactly target_score (typically max_score - 20). Has desired trait so
    it looks like a great anchor pick but fails exactly one attribute mean.
    """
    for _ in range(300):
        pair = random.sample(optimal_triple, 2)
        fail_attr_idx = random.randint(0, 2)
        fail_attr = ATTRIBUTES[fail_attr_idx]
        lo = scenario["attributes"][fail_attr]["min"]
        hi = scenario["attributes"][fail_attr]["max"]
        pair_sum = sum(m[fail_attr] for m in pair)
        if random.random() < 0.5:
            target_val = max(1, 3 * lo - pair_sum - random.randint(0, 1))
        else:
            target_val = min(10, 3 * hi - pair_sum + random.randint(1, 2))
        attrs = []
        for j, attr in enumerate(ATTRIBUTES):
            if j == fail_attr_idx:
                attrs.append(target_val)
            else:
                lo_a = scenario["attributes"][attr]["min"]
                hi_a = scenario["attributes"][attr]["max"]
                attrs.append(in_range_value(lo_a, hi_a))
        m = make_microbe(attrs, scenario["desired_trait"])
        if score_combo_list(pair + [m], scenario) == target_score:
            if not has_inviable_attribute(m, scenario):
                return m
    return None


def build_filler(scenario: dict, tier: str) -> dict:
    """Generic plausible-zone filler microbe."""
    attrs = []
    zone  = 2 if tier == "hadal" else 3
    for attr in ATTRIBUTES:
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        attrs.append(plausible_value(lo, hi, zone=zone))
    trait = random.choice(TRAITS)
    return make_microbe(attrs, trait)


def enforce_trait_guarantees(pool: list, scenario: dict) -> list:
    """
    Ensure the pool always contains:
    1. At least 1 plausible desired-trait microbe (not inviable)
    2. At least 1 undesired-trait microbe
    If either is missing, replace the last neutral microbe with the required one.
    """
    d_trait = scenario["desired_trait"]
    u_trait = scenario["undesired_trait"]

    has_viable_desired = any(
        m["trait"] == d_trait and not has_inviable_attribute(m, scenario)
        for m in pool
    )
    has_undesired = any(m["trait"] == u_trait for m in pool)

    replacements_needed = []
    if not has_viable_desired:
        attrs = [plausible_value(
                     scenario["attributes"][a]["min"],
                     scenario["attributes"][a]["max"],
                     zone=2,
                 ) for a in ATTRIBUTES]
        replacements_needed.append(make_microbe(attrs, d_trait))
    if not has_undesired:
        replacements_needed.append(build_trait_trap(scenario, intensity="strong"))

    if not replacements_needed:
        return pool

    new_pool = list(pool)
    for replacement in replacements_needed:
        for i in range(len(new_pool) - 1, -1, -1):
            if new_pool[i]["trait"] != d_trait and new_pool[i]["trait"] != u_trait:
                new_pool[i] = replacement
                break
        else:
            new_pool[-1] = replacement
    return new_pool


def assemble_pool(
    optimal_triple: list,
    distractors: list,
    scenario: dict,
    tier: str,
) -> Optional[dict]:
    """
    Combine optimal triple + distractors, score, validate.
    Returns pool dict or None if validation fails.
    """
    pool = optimal_triple + distractors
    random.shuffle(pool)
    pool = enforce_trait_guarantees(pool, scenario)
    pool = assign_ids(pool)

    combo_scores = score_all_combos_list(pool, scenario)
    max_score    = int(combo_scores.max())
    count        = int((combo_scores == max_score).sum())

    hd = compute_human_difficulty(pool, combo_scores, max_score, scenario)

    if not classify_pool(max_score, count, hd, tier):
        return None

    best_ci     = int(np.where(combo_scores == max_score)[0][0])
    best_combo  = [pool[i]["id"] for i in COMBO_IDX[best_ci]]

    return {
        "pool":         pool,
        "max_score":    max_score,
        "best_combo":   best_combo,
        "hd":           hd,
        "combo_scores": combo_scores,
    }


# ── Per-tier adversarial generation ───────────────────────────────────────────

def generate_one_pool(scenario: dict, tier: str) -> Optional[dict]:
    """
    Attempt to generate one valid pool for the given tier using
    adversarial construction. Falls back to plausible-zone random.
    """
    cfg        = TIER_CONFIGS[tier]
    target_max = cfg["max_score"] if cfg["max_score"] else random.choice([80, 60])

    # ── Adversarial attempts ───────────────────────────────────────────────────
    for _ in range(MAX_ADVERSARIAL_ATTEMPTS):
        optimal = build_optimal_triple(scenario, target_max, tier)
        if not optimal:
            continue

        distractors = []

        if tier == "easy":
            # 4 obvious rejects (one attribute far out of range)
            for _ in range(4):
                attrs = []
                bad_j = random.randint(0, 2)
                for j, attr in enumerate(ATTRIBUTES):
                    lo = scenario["attributes"][attr]["min"]
                    hi = scenario["attributes"][attr]["max"]
                    if j == bad_j:
                        if random.random() < 0.5:
                            attrs.append(max(1, lo - random.randint(3, 5)))
                        else:
                            attrs.append(min(10, hi + random.randint(3, 5)))
                    else:
                        attrs.append(plausible_value(lo, hi))
                distractors.append(
                    make_microbe(attrs,
                                 random.choice([t for t in TRAITS
                                                if t != scenario["desired_trait"]]))
                )
            # 2 undesired-trait microbes
            for _ in range(2):
                distractors.append(build_trait_trap(scenario, intensity="weak"))
            # 1 filler
            distractors.append(build_filler(scenario, tier))

        elif tier == "medium":
            # 2 strong trait traps
            for _ in range(2):
                distractors.append(build_trait_trap(scenario, intensity="strong"))
            # 1 averaging trap
            at = build_averaging_trap(scenario, optimal)
            distractors.append(at if at else build_filler(scenario, tier))
            # 1 flawed desired anchor
            fa = build_flawed_desired_anchor(scenario)
            distractors.append(fa if fa else build_filler(scenario, tier))
            # 3 fillers
            for _ in range(3):
                distractors.append(build_filler(scenario, tier))

        elif tier == "hard":
            # Optimal has no desired trait → heuristic always fails
            # 2 strong trait traps (undesired + great attributes)
            for _ in range(2):
                distractors.append(build_trait_trap(scenario, intensity="strong"))
            # 2 flawed desired anchors (desired trait but bad attribute)
            for _ in range(2):
                fa = build_flawed_desired_anchor(scenario)
                distractors.append(fa if fa else build_filler(scenario, tier))
            # 1 averaging trap
            at = build_averaging_trap(scenario, optimal)
            distractors.append(at if at else build_filler(scenario, tier))
            # 1 obvious decoy: desired trait + forms max-20 combo with 2 optimal
            od = build_obvious_decoy_microbe(scenario, optimal, target_max - 20)
            distractors.append(od if od else build_filler(scenario, tier))
            # 1 filler
            distractors.append(build_filler(scenario, tier))

        elif tier == "expert":
            # Like hard but accept lower cog
            for _ in range(2):
                distractors.append(build_trait_trap(scenario, intensity="strong"))
            fa = build_flawed_desired_anchor(scenario)
            distractors.append(fa if fa else build_filler(scenario, tier))
            at = build_averaging_trap(scenario, optimal)
            distractors.append(at if at else build_filler(scenario, tier))
            # 2 obvious decoys for expert (more misleading combos)
            for _ in range(2):
                od = build_obvious_decoy_microbe(scenario, optimal, target_max - 20)
                distractors.append(od if od else build_filler(scenario, tier))
            # 1 filler
            distractors.append(build_filler(scenario, tier))

# hadal pools are generated via promotion/upgrade in generate_pools_for_scenario
# not directly via generate_one_pool

        # elif tier == "hadal":
            # # Brutal: no desired trait in optimal, multiple traps, tight zone
            # for _ in range(2):
                # distractors.append(build_trait_trap(scenario, intensity="strong"))
            # for _ in range(2):
                # fa = build_flawed_desired_anchor(scenario)
                # distractors.append(fa if fa else build_filler(scenario, tier))
            # for _ in range(2):
                # at = build_averaging_trap(scenario, optimal)
                # distractors.append(at if at else build_filler(scenario, tier))
            # distractors.append(build_filler(scenario, tier))

        if len(distractors) + len(optimal) != 10:
            # Safety: pad or trim to exactly 10
            while len(distractors) + len(optimal) < 10:
                distractors.append(build_filler(scenario, tier))
            distractors = distractors[:10 - len(optimal)]

        result = assemble_pool(optimal, distractors, scenario, tier)
        if result:
            return result

    # ── Fallback: plausible-zone random ───────────────────────────────────────
    for _ in range(MAX_FALLBACK_ATTEMPTS):
        pool = []
        for _ in range(10):
            attrs = [plausible_value(
                         scenario["attributes"][a]["min"],
                         scenario["attributes"][a]["max"],
                         zone=3,
                     ) for a in ATTRIBUTES]
            pool.append(make_microbe(attrs, random.choice(TRAITS)))
        pool = assign_ids(pool)

        combo_scores = score_all_combos_list(pool, scenario)
        max_score    = int(combo_scores.max())
        count        = int((combo_scores == max_score).sum())
        hd           = compute_human_difficulty(pool, combo_scores, max_score, scenario)

        if not classify_pool(max_score, count, hd, tier):
            continue

        best_ci    = int(np.where(combo_scores == max_score)[0][0])
        best_combo = [pool[i]["id"] for i in COMBO_IDX[best_ci]]
        return {
            "pool":         pool,
            "max_score":    max_score,
            "best_combo":   best_combo,
            "hd":           hd,
            "combo_scores": combo_scores,
        }

    return None


# ── Per-scenario generation ────────────────────────────────────────────────────

def generate_pools_for_scenario(scenario: dict) -> dict:
    name     = scenario["name"]
    key      = name.lower().replace(" ", "_")
    is_hadal = name == "Hadal Abyss"

    # Generate standard tiers first
    standard_tiers = {
        "easy":   15,
        "medium": 10,
        "hard":   5,
        "expert": 5,
    }

    found = {t: [] for t in standard_tiers}
    found["hadal"] = []

    for tier, target in standard_tiers.items():
        attempts = 0
        while len(found[tier]) < target:
            attempts += 1
            result = generate_one_pool(scenario, tier)
            if result is None:
                if attempts % 500 == 0:
                    print(
                        f"  [{name}] {tier}: {attempts} outer attempts, "
                        f"{len(found[tier])}/{target} found"
                    )
                continue

            pool_num = len(found[tier]) + 1
            hd       = result["hd"]

            found[tier].append({
                "pool_id":           f"{key}_{tier}_{pool_num:02d}",
                "max_score":         result["max_score"],
                "difficulty":        tier,
                "microbes":          result["pool"],
                "best_combinations": [result["best_combo"]],
                "difficulty_score":  hd["H"],
                "difficulty_band":   hd["difficulty_band"],
                "near_miss_count":   hd["near_miss_count"],
                "desired_trap":      hd["desired_trap"],
                "undesired_bait":    hd["undesired_bait"],
            })
            print(
                f"  [{name}] {tier} {pool_num}/{target} "
                f"H={hd['H']:.1f} "
                f"hr={hd['heuristic_resistance']:.1f} "
                f"dd={hd['decoy_density']:.1f} "
                f"cl={hd['cognitive_load']:.1f} "
                f"tt={hd['trait_trap_intensity']:.1f} "
                f"(outer attempt {attempts})"
            )

    # ── Hadal generation ───────────────────────────────────────────────────────
    hadal_target  = HADAL_ABYSS_TARGET if is_hadal else 2
    hadal_criteria = [
        # Each entry: (hr_min, dd_min, tt_min, H_min)
        # Start strict, progressively relax if needed
        (6, 6, 5, 65),
        (5, 5, 4, 60),
        (4, 4, 3, 55),
        (3, 3, 2, 50),
    ]

    def meets_hadal(hd: dict, max_score: int, count: int, criteria: tuple) -> bool:
        hr_min, dd_min, tt_min, H_min = criteria
        if max_score not in (80, 60):               return False
        if count > 2:                               return False
        if hd["heuristic_resistance"] < hr_min:    return False
        if hd["decoy_density"] < dd_min:           return False
        # if hd["effective_pool_size"] < eps_min:    return False
        if hd["trait_trap_intensity"] < tt_min:    return False
        if hd["H"] < H_min:                        return False
        return True

    # Pass 1: scan already-generated hard + expert pools for hadal candidates
    for source_tier in ("hard", "expert"):
        for pool_obj in found[source_tier]:
            if len(found["hadal"]) >= hadal_target:
                break
            microbes     = pool_obj["microbes"]
            combo_scores = score_all_combos_list(microbes, scenario)
            max_score    = int(combo_scores.max())
            count        = int((combo_scores == max_score).sum())
            hd           = compute_human_difficulty(
                microbes, combo_scores, max_score, scenario
            )
            if meets_hadal(hd, max_score, count, hadal_criteria[0]):
                pool_num = len(found["hadal"]) + 1
                found["hadal"].append({
                    "pool_id":           f"{key}_hadal_{pool_num:02d}",
                    "max_score":         max_score,
                    "difficulty":        "hadal",
                    "microbes":          microbes,
                    "best_combinations": pool_obj["best_combinations"],
                    "difficulty_score":  hd["H"],
                    "difficulty_band":   hd["difficulty_band"],
                    "near_miss_count":   hd["near_miss_count"],
                    "desired_trap":      hd["desired_trap"],
                    "undesired_bait":    hd["undesired_bait"],
                })
                print(
                    f"  [{name}] hadal {pool_num}/{hadal_target} "
                    f"H={hd['H']:.1f} promoted from {source_tier}"
                )

    # Pass 2: generate new pools targeting hadal, with progressive relaxation
    if len(found["hadal"]) < hadal_target:
        for criteria_idx, criteria in enumerate(hadal_criteria):
            if len(found["hadal"]) >= hadal_target:
                break

            hr_min, dd_min, tt_min, H_min = criteria
            if criteria_idx > 0:
                print(
                    f"  [{name}] hadal: relaxing criteria to "
                    f"tt>={tt_min} H>={H_min}"
                )

            attempts = 0
            max_attempts = 1000

            while len(found["hadal"]) < hadal_target and attempts < max_attempts:
                attempts += 1

                # Alternate between generating hard and expert pools
                source_tier = "hard" if attempts % 2 == 0 else "expert"
                result = generate_one_pool(scenario, source_tier)
                if result is None:
                    continue

                hd       = result["hd"]
                max_s    = result["max_score"]
                count    = int(
                    (result["combo_scores"] == max_s).sum()
                )
                
                # Diagnostic: print every candidate's scores
                if attempts <= 20:
                    print(
                        f"    [hadal candidate] "
                        f"max={max_s} count={count} "
                        f"H={hd['H']:.1f} "
                        f"hr={hd['heuristic_resistance']:.1f} "
                        f"dd={hd['decoy_density']:.1f} "
                        f"eps={hd['effective_pool_size']:.1f} "
                        f"tt={hd['trait_trap_intensity']:.1f}"
                    )

                if not meets_hadal(hd, max_s, count, criteria):
                    continue

                pool_num = len(found["hadal"]) + 1
                found["hadal"].append({
                    "pool_id":           f"{key}_hadal_{pool_num:02d}",
                    "max_score":         max_s,
                    "difficulty":        "hadal",
                    "microbes":          result["pool"],
                    "best_combinations": [result["best_combo"]],
                    "difficulty_score":  hd["H"],
                    "difficulty_band":   hd["difficulty_band"],
                    "near_miss_count":   hd["near_miss_count"],
                    "desired_trap":      hd["desired_trap"],
                    "undesired_bait":    hd["undesired_bait"],
                })
                print(
                    f"  [{name}] hadal {pool_num}/{hadal_target} "
                    f"H={hd['H']:.1f} "
                    f"hr={hd['heuristic_resistance']:.1f} "
                    f"dd={hd['decoy_density']:.1f} "
                    f"tt={hd['trait_trap_intensity']:.1f} "
                    f"(criteria level {criteria_idx+1}, attempt {attempts})"
                )

            if attempts >= max_attempts and len(found["hadal"]) < hadal_target:
                print(
                    f"  [{name}] hadal: hit {max_attempts} attempts at "
                    f"criteria level {criteria_idx+1}, "
                    f"found {len(found['hadal'])}/{hadal_target}"
                )

    if len(found["hadal"]) < hadal_target:
        print(
            f"  [{name}] hadal: WARNING — only found "
            f"{len(found['hadal'])}/{hadal_target} pools after all relaxation levels"
        )

    total_pools = sum(len(v) for v in found.values())
    print(f"  Scenario '{name}' complete — {total_pools} total pools")

    return found


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json") as fh:
        data = json.load(fh)

    for scenario in data["scenarios"]:
        s_name = scenario.get("name", "<unknown>")
        for a in ATTRIBUTES:
            lo = scenario["attributes"][a]["min"]
            hi = scenario["attributes"][a]["max"]
            if (hi - lo) != 2:
                raise ValueError(
                    f"Scenario '{s_name}' attribute '{a}' "
                    f"has range {lo}-{hi}; expected max-min==2"
                )

    output             = {}
    scenario_pool_counts = {}
    band_counts        = {}

    for scenario in data["scenarios"]:
        print(f"\n=== {scenario['name']} ===")
        scenario_output = generate_pools_for_scenario(scenario)
        output[scenario["name"]] = scenario_output

        pool_count = 0
        for tier_name, pools in scenario_output.items():
            pool_count += len(pools)
            for p in pools:
                band = p.get("difficulty_band")
                if band:
                    band_counts[band] = band_counts.get(band, 0) + 1
        scenario_pool_counts[scenario["name"]] = pool_count

    out_path = script_dir / "pools.json"
    with open(out_path, "w") as fh:
        json.dump(output, fh, indent=2)

    print("\n=== Generation complete ===")
    for s_name, cnt in scenario_pool_counts.items():
        print(f"  {s_name}: {cnt} pools")
    print("  Difficulty band distribution:")
    for band in sorted(band_counts.keys()):
        print(f"    {band}: {band_counts[band]}")
    print(f"\nWritten to {out_path}")


if __name__ == "__main__":
    main()