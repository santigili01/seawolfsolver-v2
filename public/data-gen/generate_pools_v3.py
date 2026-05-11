#!/usr/bin/env python3
"""
generate_pools_v3.py

Adversarial pool generator for SeaWolfPrep — Phase 4 Treatment pools.

━━ CORE GUARANTEE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  EVERY POOL HAS EXACTLY 1 OPTIMAL COMBO.

  Previous generators failed because they built an optimal triple and then
  added distractors independently, not verifying that the distractors couldn't
  combine with each other or with the optimal microbes to score equally high.

  This generator uses adversarial one-at-a-time placement: each distractor
  microbe is accepted ONLY if it cannot form a target_max-scoring combination
  with any two microbes already placed. This is checked at construction time,
  not post-hoc. The final score_all() check is a safety net only.

━━ DIFFICULTY DESIGN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Difficulty is NOT about having multiple optima. It comes from:

  1. Near-optimal decoys — many combos scoring just below max (score-20).
     The player finds what looks like the right answer, but it's not quite.

  2. Plausible wrong anchors — desired-trait microbes with attrs almost-in-range.
     Players gravitate toward desired-trait microbes as anchors. These look
     perfect but pull attribute means outside range when combined.

  3. Trait traps — undesired-trait microbes with excellent attributes.
     Players who don't read trait icons carefully will include these.

  4. Similarity — when all microbes have similar values, the player can't
     quickly eliminate any and must evaluate all 120 combinations mentally.

  5. Win margin — when the second-best combo scores max-20, the player needs
     precise arithmetic to distinguish the optimal from near-optima.

  Difficulty tiers are determined by the combination of:
    - n_obvious_rejects:   fewer rejects = harder (more plausible candidates)
    - n_desired_anchors:   more desired distractors = harder anchor ambiguity
    - near_range_zone:     tighter zone = more similar pool = harder similarity

━━ H FORMULA (6 factors) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  H = (dd*0.22 + ps*0.16 + ss*0.30 + wm*0.12 + tt*0.10 + aa*0.10) * 10

  dd: decoy_density        — combos in [max-20, max)
  ps: plateau_score        — density at highest score level below max
  ss: similarity_score     — inverse mean pairwise microbe distance
  wm: win_margin           — gap between max and second-best score
  tt: trait_trap_intensity — trait-based deception strength
  aa: anchor_ambiguity     — desired-trait microbes appearing in near-optimal combos

━━ INVARIANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Exactly 10 microbes.
  2. Exactly 1 combo achieves max_score (the core guarantee).
  3. At least 1 non-inviable desired-trait microbe (can't be only in optimal).
  4. At least 1 undesired-trait microbe.
  5. No duplicate microbe IDs.

━━ TARGETS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  360 total, ~33 per scenario. Bands 25% each. Max score 50/30/20.

━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  pools_v3.json — does NOT touch pools.json

Run from public/data-gen/:
  python generate_pools_v3.py
"""

import json
import random
import itertools
from pathlib import Path
from typing import Optional
from statistics import mean

import numpy as np

# ── Reproducibility ────────────────────────────────────────────────────────────
random.seed(42)
np.random.seed(42)

# ── Names ──────────────────────────────────────────────────────────────────────
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
COMBO_IDX  = np.array(list(itertools.combinations(range(10), 3)), dtype=np.int32)

# ── Quota targets ──────────────────────────────────────────────────────────────
TOTAL_POOLS         = 360
SCENARIOS_COUNT     = 11
BANDS               = ["beginner", "intermediate", "advanced", "hadal"]
MAX_SCORE_VALUES    = [100, 80, 60]
MAX_SCORE_FRACTIONS = {100: 0.50, 80: 0.30, 60: 0.20}
PROGRESS_INTERVAL   = 2000

# ── H band boundaries ──────────────────────────────────────────────────────────
# Calibrated against actual generation output with 1-optimal pools.
# With the adversarial builder, most pools land in advanced/hadal zone naturally
# because the constraint forces high near-optimal density.
# Tune after first run using validate_pools_v3.py.
# Calibrated against actual recipe output (measured empirically):
#   beginner recipe:     H 49-65, mean 58
#   intermediate recipe: H 56-71, mean 64
#   advanced recipe:     H 65-80, mean 71
#   hadal recipe:        H 70+
# Overlapping boundaries ensure all bands are reachable.
BAND_H_RANGES = {
    "beginner":     (0,   58),
    "intermediate": (55,  67),
    "advanced":     (63,  73),
    "hadal":        (70, 100),
}

# Which recipes to try when a band needs more pools.
# Multiple recipes per band because H ranges overlap — any recipe that
# happens to land in the needed band is accepted.
BAND_RECIPES = {
    "beginner":     ["beginner"],
    "intermediate": ["beginner", "intermediate"],
    "advanced":     ["intermediate", "advanced"],
    "hadal":        ["advanced", "hadal"],
}


# =============================================================================
# SCORING  (mirrors lib/game-scoring.ts Phase 4 exactly)
# =============================================================================

def score_combo(trio: list, sc: dict) -> int:
    score = 100
    for a in ATTRIBUTES:
        lo = sc["attributes"][a]["min"]
        hi = sc["attributes"][a]["max"]
        if not (lo <= sum(m[a] for m in trio) / 3.0 <= hi):
            score -= 20
    traits = {m["trait"] for m in trio}
    if sc["desired_trait"]   not in traits: score -= 20
    if sc["undesired_trait"]     in traits: score -= 20
    return score


def score_all(ms: list, sc: dict) -> np.ndarray:
    attrs  = np.array([[m["Mobility"], m["Agility"], m["Size"]] for m in ms],
                      dtype=np.float32)
    traits = np.array([TRAITS.index(m["trait"]) for m in ms], dtype=np.int32)
    d_idx  = TRAITS.index(sc["desired_trait"])
    u_idx  = TRAITS.index(sc["undesired_trait"])
    means  = attrs[COMBO_IDX].mean(axis=1)
    scores = np.full(120, 100, dtype=np.int32)
    for j, a in enumerate(ATTRIBUTES):
        lo = sc["attributes"][a]["min"]
        hi = sc["attributes"][a]["max"]
        scores -= 20 * ((means[:, j] < lo) | (means[:, j] > hi)).astype(np.int32)
    ct = traits[COMBO_IDX]
    scores -= 20 * (~np.any(ct == d_idx, axis=1)).astype(np.int32)
    scores -= 20 * ( np.any(ct == u_idx, axis=1)).astype(np.int32)
    return scores


# =============================================================================
# MICROBE HELPERS
# =============================================================================

def is_inviable(val: int, lo: int, hi: int) -> bool:
    return val + 10 + 10 < 3 * lo or val + 1 + 1 > 3 * hi


def has_inviable(m: dict, sc: dict) -> bool:
    return any(is_inviable(m[a], sc["attributes"][a]["min"],
                           sc["attributes"][a]["max"])
               for a in ATTRIBUTES)


def attr_quality(m: dict, sc: dict) -> int:
    return sum(1 for a in ATTRIBUTES
               if sc["attributes"][a]["min"] <= m[a] <= sc["attributes"][a]["max"])


def make_name() -> str:
    return f"{random.choice(PREFIXES)} {random.choice(SUFFIXES)}"


def mkm(sc: dict, trait: str, style: str = "in") -> dict:
    """
    Build a microbe with the given trait and attribute sampling style.
      "in"    — all attrs strictly within [lo, hi]
      "near1" — attrs within [lo-1, hi+1]
      "near2" — attrs within [lo-2, hi+2]
      "near3" — attrs within [lo-3, hi+3]
      "far"   — one attr far outside range (obvious reject)
    """
    attrs = {}
    if style == "far":
        bad_j = random.randint(0, 2)
        for j, a in enumerate(ATTRIBUTES):
            lo = sc["attributes"][a]["min"]
            hi = sc["attributes"][a]["max"]
            if j == bad_j:
                if random.random() < 0.5:
                    attrs[a] = max(1, lo - random.randint(3, 5))
                else:
                    attrs[a] = min(10, hi + random.randint(3, 5))
            else:
                attrs[a] = random.randint(max(1, lo - 2), min(10, hi + 2))
    else:
        zone = {"in": 0, "near1": 1, "near2": 2, "near3": 3}.get(style, 2)
        for a in ATTRIBUTES:
            lo = sc["attributes"][a]["min"]
            hi = sc["attributes"][a]["max"]
            attrs[a] = random.randint(max(1, lo - zone), min(10, hi + zone))
    m = {"id": "", "name": make_name(), "trait": trait}
    m.update(attrs)
    return m


def assign_ids(ms: list) -> list:
    for i, m in enumerate(ms):
        m["id"] = f"M{i+1:03d}"
    return ms


def neutral(sc: dict) -> str:
    opts = [t for t in TRAITS
            if t != sc["desired_trait"] and t != sc["undesired_trait"]]
    return random.choice(opts)


# =============================================================================
# BOTS
# =============================================================================

def bot_greedy_anchor(ms: list, sc: dict) -> int:
    desired = [m for m in ms if m["trait"] == sc["desired_trait"]
               and not has_inviable(m, sc)]
    others  = [m for m in ms if m["trait"] != sc["undesired_trait"]
               and not has_inviable(m, sc)]
    if not desired:
        top3 = sorted(others, key=lambda m: attr_quality(m, sc), reverse=True)[:3]
    else:
        anchor  = max(desired, key=lambda m: attr_quality(m, sc))
        fillers = sorted([m for m in others if m["id"] != anchor["id"]],
                         key=lambda m: attr_quality(m, sc), reverse=True)[:2]
        top3    = [anchor] + fillers
    return score_combo(top3, sc) if len(top3) == 3 else 0


def bot_attribute_max(ms: list, sc: dict) -> int:
    cands = [m for m in ms if m["trait"] != sc["undesired_trait"]]
    if len(cands) < 3: cands = ms
    top3 = sorted(cands, key=lambda m: attr_quality(m, sc), reverse=True)[:3]
    return score_combo(top3, sc)


def bot_trait_first(ms: list, sc: dict) -> int:
    desired = [m for m in ms if m["trait"] == sc["desired_trait"]]
    if len(desired) >= 3:
        top3 = sorted(desired, key=lambda m: attr_quality(m, sc), reverse=True)[:3]
        return score_combo(top3, sc)
    return bot_attribute_max(ms, sc)


def bot_balanced(ms: list, sc: dict) -> int:
    d = {i for i, m in enumerate(ms) if m["trait"] == sc["desired_trait"]}
    u = {i for i, m in enumerate(ms) if m["trait"] == sc["undesired_trait"]}
    best = 0
    for c in COMBO_IDX:
        if any(i in u for i in c) or not any(i in d for i in c):
            continue
        s = score_combo([ms[i] for i in c], sc)
        if s > best: best = s
    return best


def bot_timebox(ms: list, sc: dict) -> int:
    ranked = sorted(COMBO_IDX,
                    key=lambda c: sum(attr_quality(ms[i], sc) for i in c),
                    reverse=True)
    for c in ranked:
        s = score_combo([ms[i] for i in c], sc)
        if s >= 60: return s
    return 0


def bot_first_impression(ms: list, sc: dict) -> int:
    def ind(m: dict) -> float:
        s  = sum(1 for a in ATTRIBUTES
                 if sc["attributes"][a]["min"] <= m[a] <= sc["attributes"][a]["max"])
        if m["trait"] == sc["desired_trait"]:   s += 2
        if m["trait"] == sc["undesired_trait"]: s -= 3
        return s
    return score_combo(sorted(ms, key=ind, reverse=True)[:3], sc)


def all_bots(ms: list, sc: dict) -> dict:
    return {
        "GreedyAnchorBot":       bot_greedy_anchor(ms, sc),
        "AttributeMaximizerBot": bot_attribute_max(ms, sc),
        "TraitFirstBot":         bot_trait_first(ms, sc),
        "BalancedBot":           bot_balanced(ms, sc),
        "TimeBoxedBot":          bot_timebox(ms, sc),
        "FirstImpressionBot":    bot_first_impression(ms, sc),
    }


# =============================================================================
# H SCORE — 6-FACTOR MODEL
# =============================================================================

def _dd(cs: np.ndarray, max_score: int) -> float:
    n = int(np.sum((cs >= max_score - 20) & (cs < max_score)))
    if n == 0:  return 0.0
    if n <= 2:  return 3.0
    if n <= 5:  return 5.0
    if n <= 10: return 7.0
    if n <= 20: return 8.5
    return 10.0


def _ps(cs: np.ndarray, max_score: int) -> float:
    below = cs[cs < max_score]
    if len(below) == 0: return 0.0
    n = int(np.sum(cs == int(below.max())))
    if n <= 1:  return 0.0
    if n <= 4:  return 3.0
    if n <= 9:  return 6.0
    if n <= 19: return 8.5
    return 10.0


def _ss(ms: list) -> float:
    n = len(ms)
    total, pairs = 0.0, 0
    for i in range(n):
        for j in range(i + 1, n):
            total += sum(abs(ms[i][a] - ms[j][a]) for a in ATTRIBUTES)
            total += 0 if ms[i]["trait"] == ms[j]["trait"] else 5
            pairs += 1
    d = total / pairs
    if d <= 4:  return 10.0
    if d <= 6:  return 8.0
    if d <= 8:  return 5.0
    if d <= 10: return 3.0
    return 0.0


def _wm(cs: np.ndarray, max_score: int) -> float:
    below = cs[cs < max_score]
    if len(below) == 0: return 0.0
    return max(0.0, 10.0 * (1.0 - (max_score - int(below.max())) / 40.0))


def _tt(ms: list, sc: dict, optimal: list) -> float:
    score  = 0.0
    d_ms   = [m for m in ms if m["trait"] == sc["desired_trait"]]
    u_ms   = [m for m in ms if m["trait"] == sc["undesired_trait"]]
    if u_ms:
        avg_u = mean(attr_quality(m, sc) for m in u_ms)
        avg_d = mean(attr_quality(m, sc) for m in d_ms) if d_ms else 0
        if avg_u > avg_d:
            score += min(4.0, avg_u - avg_d)
        elif not d_ms:
            score += 4.0
    if d_ms and all(any(m[a] < sc["attributes"][a]["min"] - 1 or
                        m[a] > sc["attributes"][a]["max"] + 1
                        for a in ATTRIBUTES)
                    for m in d_ms):
        score += 3.0
    if sc["desired_trait"] not in {m["trait"] for m in optimal}:
        score += 3.0
    return min(10.0, score)


def _aa(ms: list, sc: dict, cs: np.ndarray, max_score: int) -> float:
    count = 0
    for i, m in enumerate(ms):
        if m["trait"] != sc["desired_trait"] or has_inviable(m, sc):
            continue
        with_m = [ci for ci, t in enumerate(COMBO_IDX) if i in t]
        if any(int(cs[ci]) >= max_score - 20 for ci in with_m):
            count += 1
    return 2.0 if count <= 1 else (6.0 if count == 2 else 10.0)


def compute_h(ms: list, cs: np.ndarray, max_score: int, sc: dict) -> dict:
    best_ci = int(np.where(cs == max_score)[0][0])
    optimal = [ms[i] for i in COMBO_IDX[best_ci]]

    dd = _dd(cs, max_score)
    ps = _ps(cs, max_score)
    ss = _ss(ms)
    wm = _wm(cs, max_score)
    tt = _tt(ms, sc, optimal)
    aa = _aa(ms, sc, cs, max_score)

    H    = min(100.0, (dd*0.22 + ps*0.16 + ss*0.30 + wm*0.12 + tt*0.10 + aa*0.10) * 10.0)
    band = h_to_band(H)
    return {
        "H":    round(H, 1),
        "band": band,
        "factors": {
            "decoy_density":        round(dd, 2),
            "plateau_score":        round(ps, 2),
            "similarity_score":     round(ss, 2),
            "win_margin":           round(wm, 2),
            "trait_trap_intensity": round(tt, 2),
            "anchor_ambiguity":     round(aa, 2),
        },
    }


def h_to_band(H: float) -> str:
    for band in BANDS:
        lo, hi = BAND_H_RANGES[band]
        if lo <= H <= hi:
            return band
    if H < BAND_H_RANGES["beginner"][0]:  return "beginner"
    if H > BAND_H_RANGES["hadal"][1]:     return "hadal"
    if H > BAND_H_RANGES["beginner"][1]:  return "intermediate"
    return "advanced"


# =============================================================================
# ADVERSARIAL POOL BUILDER
# =============================================================================

def no_new_optimal(candidate: dict, placed: list, tmax: int, sc: dict) -> bool:
    """
    Returns True if adding candidate to placed does NOT create any combo
    scoring >= tmax. Checks all pairs from placed against the candidate.
    This is the core guarantee: every accepted distractor is verified at
    placement time to not create a new optimal-scoring combination.
    """
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            if score_combo([placed[i], placed[j], candidate], sc) >= tmax:
                return False
    return True


# Distractor slot recipes per difficulty tier.
# Each recipe is a list of (trait_spec, style) tuples — 7 total (one per distractor slot).
#
#   trait_spec: "desired" | "undesired" | "neutral" | "any_non_undesired"
#   style:      "in" | "near1" | "near2" | "near3" | "far"
#
# Design logic:
#   "far" style = obvious reject (player eliminates it immediately)
#   "in" + undesired = trait trap (great attrs, wrong trait)
#   "near1/2" + desired = flawed anchor (looks good, pulls means wrong)
#   "in/near1" + neutral = near-optimal bait (creates dense score-80 plateau)
#   more "far" = easier (more things to immediately reject)
#   fewer "far" = harder (everything looks plausible)

TIER_RECIPES = {
    "beginner": [
        ("undesired",          "in"),     # trait trap — always present
        ("desired",            "near2"),  # 1 desired anchor
        ("any_non_undesired",  "far"),    # obvious reject
        ("any_non_undesired",  "far"),    # obvious reject
        ("any_non_undesired",  "far"),    # obvious reject
        ("any_non_undesired",  "far"),    # obvious reject
        ("any_non_undesired",  "near3"),  # loose filler
    ],
    "intermediate": [
        ("undesired",          "in"),     # trait trap
        ("undesired",          "in"),     # 2nd trait trap
        ("desired",            "near2"),  # desired anchor
        ("desired",            "near2"),  # 2nd desired anchor
        ("any_non_undesired",  "far"),    # obvious reject
        ("any_non_undesired",  "near2"),  # near-optimal bait
        ("any_non_undesired",  "near2"),  # near-optimal bait
    ],
    "advanced": [
        ("undesired",          "in"),     # trait trap — great attrs, wrong trait
        ("undesired",          "in"),     # 2nd trait trap
        ("desired",            "near1"),  # tight flawed anchor
        ("desired",            "near1"),  # 2nd tight flawed anchor
        ("any_non_undesired",  "near1"),  # tight near-optimal bait
        ("any_non_undesired",  "near1"),  # tight near-optimal bait
        ("any_non_undesired",  "near1"),  # tight near-optimal bait
    ],
    "hadal": [
        ("undesired",          "in"),     # trait trap
        ("undesired",          "in"),     # 2nd trait trap
        ("desired",            "near1"),  # tight desired anchor
        ("desired",            "near1"),  # 2nd tight desired anchor
        ("any_non_undesired",  "in"),     # fully in-range bait
        ("any_non_undesired",  "in"),     # fully in-range bait
        ("any_non_undesired",  "in"),     # fully in-range bait
    ],
}


def sample_trait(trait_spec: str, sc: dict) -> str:
    if trait_spec == "desired":          return sc["desired_trait"]
    if trait_spec == "undesired":        return sc["undesired_trait"]
    if trait_spec == "neutral":          return neutral(sc)
    if trait_spec == "any_non_undesired":
        return random.choice([t for t in TRAITS if t != sc["undesired_trait"]])
    return trait_spec  # literal trait name


def build_pool(sc: dict, target_max: int, tier: str,
               max_outer: int = 5000, max_inner: int = 800) -> Optional[dict]:
    """
    Adversarially build a pool with exactly 1 combo scoring target_max.

    Algorithm:
      1. Build optimal triple (3 microbes scoring exactly target_max together).
      2. For each of 7 distractor slots (recipe from TIER_RECIPES[tier]):
         - Sample a microbe candidate with the specified trait and style
         - Accept ONLY if it cannot form a target_max-scoring combo with any
           2 microbes already placed (verified by no_new_optimal)
         - Retry up to max_inner times per slot
      3. Verify: final score_all() must show exactly 1 combo at max_score.
      4. Verify invariants: desired microbe present, undesired present.
      5. Compute H score and return pool dict.

    Returns None if max_outer attempts are exhausted.
    """
    desired   = sc["desired_trait"]
    undesired = sc["undesired_trait"]
    recipe    = TIER_RECIPES[tier]

    for outer in range(max_outer):

        # ── Step 1: Build optimal triple ─────────────────────────────────────
        optimal = _build_optimal_triple(sc, target_max)
        if not optimal:
            continue

        # ── Step 2: Adversarial distractor placement ──────────────────────────
        placed = optimal.copy()
        slot_ok = True

        for trait_spec, style in recipe:
            trait = sample_trait(trait_spec, sc)
            placed_distractor = False

            for inner in range(max_inner):
                candidate = mkm(sc, trait, style)

                if no_new_optimal(candidate, placed, target_max, sc):
                    placed.append(candidate)
                    placed_distractor = True
                    break

            if not placed_distractor:
                slot_ok = False
                break  # Abandon this attempt, rebuild from scratch

        if not slot_ok:
            continue

        # ── Step 3: Final verification ────────────────────────────────────────
        random.shuffle(placed)
        placed = assign_ids(placed)
        cs     = score_all(placed, sc)
        amax   = int(cs.max())

        if amax != target_max:
            continue  # Distractor placement was correct but score_all disagrees (shouldn't happen)

        opt_count = int(np.sum(cs == amax))
        if opt_count != 1:
            continue  # Safety net — reject if multiple optima somehow crept in

        # ── Step 4: Invariants ────────────────────────────────────────────────
        has_desired = any(
            m["trait"] == desired and not has_inviable(m, sc)
            for m in placed
        )
        has_undesired = any(m["trait"] == undesired for m in placed)

        if not has_desired:
            # Insert a desired-trait microbe by replacing the last non-optimal slot
            best_ci    = int(np.where(cs == amax)[0][0])
            optimal_ix = set(COMBO_IDX[best_ci])
            for i in range(len(placed) - 1, -1, -1):
                if i in optimal_ix:
                    continue
                candidate = mkm(sc, desired, "near2")
                if has_inviable(candidate, sc):
                    continue
                # Verify this replacement doesn't create new optima
                temp = placed.copy()
                temp[i] = candidate
                temp = assign_ids(temp)
                cs_temp = score_all(temp, sc)
                if int(cs_temp.max()) == target_max and int(np.sum(cs_temp == target_max)) == 1:
                    placed = temp
                    cs     = cs_temp
                    has_desired = True
                    break
            if not has_desired:
                continue

        if not has_undesired:
            continue  # Recipe guarantees undesired — if missing, something went wrong

        # ── Step 5: H score ───────────────────────────────────────────────────
        h_data     = compute_h(placed, cs, amax, sc)
        best_ci    = int(np.where(cs == amax)[0][0])
        best_combo = [placed[i]["id"] for i in COMBO_IDX[best_ci]]

        return {
            "pool":       placed,
            "max_score":  amax,
            "best_combo": best_combo,
            "h_data":     h_data,
            "bot_scores": all_bots(placed, sc),
            "opt_count":  opt_count,
        }

    return None


def _build_optimal_triple(sc: dict, target_max: int) -> list:
    """
    Build exactly 3 microbes that together score target_max.
    Tried up to 600 times per call.
    """
    desired   = sc["desired_trait"]
    undesired = sc["undesired_trait"]

    for _ in range(600):
        if target_max == 100:
            # Desired present, no undesired, all attrs in range
            ms = [mkm(sc, desired, "in")]
            for _ in range(2):
                t = random.choice([x for x in TRAITS if x != undesired])
                ms.append(mkm(sc, t, "in"))
            if score_combo(ms, sc) == 100:
                return ms

        elif target_max == 80:
            # One condition violated: no desired trait (all attrs in range)
            ms = [mkm(sc, neutral(sc), "in") for _ in range(3)]
            if score_combo(ms, sc) == 80:
                return ms

        else:  # 60
            # Two conditions violated: desired present but two attr means out
            fails = random.sample(ATTRIBUTES, 2)
            ms = []
            for k in range(3):
                m = {"id": "", "name": make_name(), "trait": desired if k == 0
                     else random.choice([x for x in TRAITS if x != undesired])}
                for a in ATTRIBUTES:
                    lo = sc["attributes"][a]["min"]
                    hi = sc["attributes"][a]["max"]
                    if a in fails and k == 0:
                        m[a] = max(1, lo - random.randint(3, 5)) if random.random() < 0.5 \
                               else min(10, hi + random.randint(3, 5))
                    else:
                        m[a] = random.randint(lo, hi)
                ms.append(m)
            if score_combo(ms, sc) == 60:
                return ms

    return []


# =============================================================================
# QUOTA HELPERS
# =============================================================================

def compute_quotas(n: int) -> tuple:
    bq    = {}
    alloc = 0
    for band in BANDS[:-1]:
        bq[band] = max(1, n // len(BANDS))
        alloc   += bq[band]
    bq[BANDS[-1]] = n - alloc

    mq    = {}
    alloc = 0
    for ms, frac in [(100, 0.50), (80, 0.30)]:
        mq[ms] = max(1, round(n * frac))
        alloc += mq[ms]
    mq[60] = n - alloc
    return bq, mq


def choose_target_max(mq: dict, mf: dict) -> int:
    """
    Sample target_max weighted toward under-represented values.
    Floor weight of 0.05 keeps all values available even when quotas are met,
    preventing stalls where the last needed band can only be generated with
    a specific max_score.
    """
    weights = {}
    for ms in MAX_SCORE_VALUES:
        needed      = max(0, mq.get(ms, 0) - mf.get(ms, 0))
        weights[ms] = max(0.05, MAX_SCORE_FRACTIONS[ms] + needed * 0.5)
    tot = sum(weights.values())
    r   = random.random() * tot
    cum = 0.0
    for ms, w in weights.items():
        cum += w
        if r <= cum:
            return ms
    return 100


def choose_band_to_fill(bq: dict, bf: dict) -> str:
    """Sample a band that still needs pools, weighted by how far behind it is."""
    needed = {b: max(0, bq[b] - bf[b]) for b in BANDS}
    total  = sum(needed.values())
    if total == 0:
        return random.choice(BANDS)
    r = random.random() * total
    cum = 0.0
    for b, n in needed.items():
        cum += n
        if r <= cum:
            return b
    return BANDS[-1]


# =============================================================================
# PER-SCENARIO GENERATION
# =============================================================================

def generate_for_scenario(sc: dict, n_pools: int) -> dict:
    """
    Generate n_pools for one scenario using quota-based acceptance.
    Each pool has exactly 1 optimal combo — guaranteed by adversarial construction.
    Loops until all band quotas are met (no attempt ceiling).
    """
    name = sc["name"]
    key  = name.lower().replace(" ", "_")

    bq, mq = compute_quotas(n_pools)
    bf: dict = {b: 0 for b in BANDS}
    mf: dict = {ms: 0 for ms in MAX_SCORE_VALUES}
    found: dict = {b: [] for b in BANDS}

    def quota_met() -> bool:
        return all(bf[b] >= bq[b] for b in BANDS)

    attempts   = 0
    last_print = 0

    while not quota_met():
        attempts += 1

        # Pick the band most behind, then sample from its candidate recipes
        band    = choose_band_to_fill(bq, bf)
        recipes = BAND_RECIPES[band]
        tier    = random.choice(recipes)
        tmax    = choose_target_max(mq, mf)

        result = build_pool(sc, tmax, tier)
        if result is None:
            continue

        h_band = result["h_data"]["band"]

        # Accept into the band it actually landed in, if that band still needs pools
        if bf[h_band] >= bq[h_band]:
            continue

        bf[h_band]  += 1
        mf[tmax]     = mf.get(tmax, 0) + 1

        pool_num = len(found[h_band]) + 1
        h_data   = result["h_data"]

        entry = {
            "pool_id":           f"{key}_{h_band}_{pool_num:02d}",
            "max_score":         result["max_score"],
            "difficulty_score":  h_data["H"],
            "difficulty_band":   h_data["band"],
            "factor_breakdown":  h_data["factors"],
            "bot_scores":        result["bot_scores"],
            "microbes":          result["pool"],
            "best_combinations": [result["best_combo"]],
        }
        found[h_band].append(entry)

        total_found = sum(bf.values())
        if total_found % 5 == 0 or total_found == n_pools:
            status = " | ".join(f"{b[0].upper()}:{bf[b]}/{bq[b]}" for b in BANDS)
            print(f"  [{name}] {total_found}/{n_pools}  [{status}]  attempts:{attempts}")

        if attempts - last_print >= PROGRESS_INTERVAL:
            last_print = attempts
            missing = [b for b in BANDS if bf[b] < bq[b]]
            if missing:
                print(f"  [{name}] *** still need: "
                      + ", ".join(f"{b}({bq[b]-bf[b]})" for b in missing)
                      + f"  attempts:{attempts}")

    print(f"  [{name}] Done — {sum(bf.values())} pools in {attempts} attempts.")
    return found


# =============================================================================
# ENTRY POINT
# =============================================================================

def main() -> None:
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json") as fh:
        data = json.load(fh)

    for s in data["scenarios"]:
        for a in ATTRIBUTES:
            lo, hi = s["attributes"][a]["min"], s["attributes"][a]["max"]
            if hi - lo != 2:
                raise ValueError(
                    f"Scenario '{s['name']}' attr '{a}' range {lo}-{hi} must be 2 wide"
                )

    scenarios = data["scenarios"]
    n         = len(scenarios)
    remainder = TOTAL_POOLS % n
    base      = TOTAL_POOLS // n

    output:          dict = {}
    grand_band:      dict = {b: 0 for b in BANDS}
    grand_max:       dict = {ms: 0 for ms in MAX_SCORE_VALUES}
    scenario_totals: dict = {}

    for idx, sc in enumerate(scenarios):
        n_pools = base + (1 if idx < remainder else 0)
        print(f"\n{'='*60}")
        print(f"  {sc['name']}  ({n_pools} pools target)")
        print(f"{'='*60}")
        result = generate_for_scenario(sc, n_pools)
        output[sc["name"]] = result

        sc_total = 0
        for band, pools in result.items():
            sc_total += len(pools)
            grand_band[band] += len(pools)
            for p in pools:
                grand_max[p["max_score"]] = grand_max.get(p["max_score"], 0) + 1
        scenario_totals[sc["name"]] = sc_total

    out_path = script_dir / "pools_v3.json"
    with open(out_path, "w") as fh:
        json.dump(output, fh, indent=2)

    total = sum(scenario_totals.values())
    print(f"\n{'='*60}")
    print(f"GENERATION COMPLETE  —  {total}/{TOTAL_POOLS} pools")
    print(f"{'='*60}")

    print("\nPools per scenario:")
    for sname, cnt in scenario_totals.items():
        print(f"  {sname:<30}: {cnt}")

    print("\nDifficulty band distribution (target: 25% each):")
    for band in BANDS:
        cnt = grand_band[band]
        pct = cnt / total * 100 if total else 0
        bar = "█" * int(pct / 2)
        print(f"  {band:<15}: {cnt:>3}  ({pct:5.1f}%)  {bar}")

    print("\nMax score distribution (target: 50% / 30% / 20%):")
    for ms in MAX_SCORE_VALUES:
        cnt = grand_max.get(ms, 0)
        pct = cnt / total * 100 if total else 0
        tgt = MAX_SCORE_FRACTIONS[ms] * 100
        print(f"  max={ms}: {cnt:>3}  ({pct:5.1f}%)  target {tgt:.0f}%")

    print(f"\nWritten to: {out_path}")
    print("\nNEXT STEP: python validate_pools_v3.py")
    print("  Verify 0 invariant violations, check H distribution per band.")
    print("  If bands overlap heavily, tune BAND_H_RANGES at top of this file.")


if __name__ == "__main__":
    main()