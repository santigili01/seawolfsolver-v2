#!/usr/bin/env python3
"""
generate_pools.py  (v2 — human-difficulty model)

Key changes from v1:
- All 10 microbes generated in a "plausible zone" (±3 of range boundaries)
  so no instant-reject outliers exist in the pool
- Seed triple (optimal combination) still seeded in-range for tier targeting
- New human difficulty model replacing mathematical near-miss scoring:
    cognitive_load     (35%) — microbes requiring calculation to reject
    near_optimal_combos(30%) — combinations within 20pts of max
    averaging_traps    (20%) — microbes in-range individually but hurt means
    trait_trap_strength(15%) — trait-based traps
- Inviable microbe penalty increased from 1 to 3
- Hadal acceptance requires cognitive_load >= 7, near_optimal >= 5,
  averaging_traps >= 2
- MINI_BATCH increased to 3000 to compensate for stricter acceptance
"""

import json
import random
import itertools
from pathlib import Path
from typing import Optional

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

BASE_TIER_TARGETS  = {"easy": 15, "medium": 10, "hard": 5}
MINI_BATCH         = 3000
FALLBACK_THRESHOLD = 1_000_000

HADAL_SUBTYPE_TARGETS = {
    (100, False, False): 8,
    (80,  True,  False): 6,
    (80,  False, True):  3,
    (60,  True,  True):  3,
}

# C(10,3) = 120 index triples
COMBO_IDX = np.array(
    list(itertools.combinations(range(10), 3)), dtype=np.int32
)  # (120, 3)


# ── Vectorised batch scoring ───────────────────────────────────────────────────

def score_batch(
    attrs:         np.ndarray,
    traits:        np.ndarray,
    attr_ranges:   list,
    desired_idx:   int,
    undesired_idx: int,
) -> np.ndarray:
    combo_attrs = attrs[:, COMBO_IDX, :]      # (B, 120, 3, 3)
    means       = combo_attrs.mean(axis=2)    # (B, 120, 3)

    scores = np.full((len(attrs), 120), 100, dtype=np.int32)

    for j, (lo, hi) in enumerate(attr_ranges):
        out = (means[:, :, j] < lo) | (means[:, :, j] > hi)
        scores -= 20 * out.astype(np.int32)

    combo_traits  = traits[:, COMBO_IDX]
    no_desired    = ~np.any(combo_traits == desired_idx,   axis=2)
    has_undesired =  np.any(combo_traits == undesired_idx, axis=2)

    scores -= 20 * no_desired.astype(np.int32)
    scores -= 20 * has_undesired.astype(np.int32)

    return scores


# ── Classification ─────────────────────────────────────────────────────────────

def classify(
    max_score:     int,
    count:         int,
    scenario_name: str,
    hd:            dict,
) -> Optional[str]:
    if scenario_name == "Hadal Abyss":
        if (
            count == 1
            and max_score in (100, 80, 60)
            and hd["cognitive_load_count"] >= 7
            and hd["near_optimal_count"]   >= 5
            and hd["averaging_trap_count"] >= 2
        ):
            return "hadal"
        return None

    if max_score == 100 and count == 1:
        return "easy"
    if max_score == 80  and count == 1:
        return "medium"
    if max_score == 60  and count == 1:
        return "hard"
    return None


# ── Constrained trait-list generation ─────────────────────────────────────────

def _make_trait_lists(B: int, d_idx: int, u_idx: int) -> np.ndarray:
    if d_idx == u_idx:
        raise ValueError("desired and undesired trait indices must differ")
    result = np.empty((B, 10), dtype=np.int32)
    for b in range(B):
        counts = [0, 0, 0, 0]
        counts[d_idx] = 1
        counts[u_idx] = 1
        remaining = 8
        while remaining > 0:
            candidates = [t for t in range(4) if counts[t] < 3]
            t = random.choice(candidates)
            counts[t] += 1
            remaining -= 1
        lst: list[int] = []
        for t, c in enumerate(counts):
            lst.extend([t] * c)
        random.shuffle(lst)
        result[b] = lst
    return result


# ── Plausible zone value generation ───────────────────────────────────────────

def plausible_value(lo: int, hi: int) -> int:
    """
    Generate a value that looks plausible for a human evaluating range [lo, hi].
    Values are within ±3 of range boundaries, clamped to 1-10.
    This ensures no instant-reject outliers while keeping the pool challenging.
    """
    zone = list(range(max(1, lo - 3), min(10, hi + 3) + 1))
    return random.choice(zone)


def plausible_attrs_for_microbe(ranges: list) -> list:
    """Generate one microbe's attributes all in the plausible zone."""
    return [plausible_value(lo, hi) for lo, hi in ranges]


# ── Human difficulty scoring ───────────────────────────────────────────────────

def _requires_calculation(microbe_attrs: list, ranges: list) -> bool:
    """
    A microbe requires calculation to reject if all its attributes are
    within ±2 of their range boundaries (not instantly obviously wrong).
    """
    for val, (lo, hi) in zip(microbe_attrs, ranges):
        if val < lo - 2 or val > hi + 2:
            return False
    return True


def _is_averaging_trap(
    m_idx:    int,
    attrs:    np.ndarray,
    ranges:   list,
    combo_scores: np.ndarray,
    max_score:    int,
) -> bool:
    """
    A microbe is an averaging trap if:
    - All its individual attributes are within range [lo, hi]
    - But every combination containing it scores below max_score
      due to mean drift
    """
    m_attrs = attrs[m_idx]
    individually_ok = all(
        lo <= int(m_attrs[j]) <= hi
        for j, (lo, hi) in enumerate(ranges)
    )
    if not individually_ok:
        return False

    combos_with_m = [
        ci for ci, triple in enumerate(COMBO_IDX)
        if m_idx in triple
    ]
    if not combos_with_m:
        return False

    # If none of the combos containing this microbe reach max_score,
    # it's pulling means out of range — it's a trap
    best_with_m = max(int(combo_scores[ci]) for ci in combos_with_m)
    return best_with_m < max_score


def compute_human_difficulty(
    microbes:     list,
    combo_scores: np.ndarray,
    max_score:    int,
    scenario:     dict,
    scenario_name: str,
) -> dict:
    ranges   = [(scenario["attributes"][a]["min"],
                 scenario["attributes"][a]["max"]) for a in ATTRIBUTES]
    attrs    = np.array(
        [[m["Mobility"], m["Agility"], m["Size"]] for m in microbes],
        dtype=np.int32,
    )
    traits   = [m["trait"] for m in microbes]
    desired  = scenario["desired_trait"]
    undesired = scenario["undesired_trait"]

    # ── Cognitive load ─────────────────────────────────────────────────────────
    # Count microbes that require calculation to reject (no obvious outliers)
    calc_required = [
        _requires_calculation(
            [int(attrs[i, j]) for j in range(3)], ranges
        )
        for i in range(10)
    ]
    cognitive_load_count = sum(calc_required)
    cognitive_load_score = (cognitive_load_count / 10) * 10

    # ── Near-optimal combinations ──────────────────────────────────────────────
    # Count combinations scoring within 20pts of max
    near_optimal_count = int(np.sum(combo_scores >= max_score - 20)) - 1
    # subtract 1 to exclude the optimal itself
    near_optimal_count = max(0, near_optimal_count)

    if near_optimal_count == 0:
        near_optimal_score = 0.0
    elif near_optimal_count <= 2:
        near_optimal_score = 2.0
    elif near_optimal_count <= 5:
        near_optimal_score = 5.0
    elif near_optimal_count <= 10:
        near_optimal_score = 7.0
    else:
        near_optimal_score = 10.0

    # ── Averaging traps ────────────────────────────────────────────────────────
    averaging_trap_count = sum(
        1 for i in range(10)
        if _is_averaging_trap(i, attrs, ranges, combo_scores, max_score)
    )
    averaging_trap_score = min(10.0, averaging_trap_count * 2.5)

    # ── Trait trap strength ────────────────────────────────────────────────────
    trait_trap_score = 0.0

    # Determine optimal combo
    best_ci   = int(np.where(combo_scores == max_score)[0][0])
    best_combo = COMBO_IDX[best_ci]
    best_traits = {traits[i] for i in best_combo}

    # Undesired-trait microbe has above-average attributes vs desired-trait microbes
    undesired_idxs = [i for i, t in enumerate(traits) if t == undesired]
    desired_idxs   = [i for i, t in enumerate(traits) if t == desired]

    if undesired_idxs and desired_idxs:
        undesired_attr_mean = float(attrs[undesired_idxs].mean())
        desired_attr_mean   = float(attrs[desired_idxs].mean())
        if undesired_attr_mean > desired_attr_mean:
            trait_trap_score += 5.0

    # Desired-trait microbe is out-of-range on any attribute
    for i in desired_idxs:
        m_attrs = [int(attrs[i, j]) for j in range(3)]
        if any(v < lo or v > hi for v, (lo, hi) in zip(m_attrs, ranges)):
            trait_trap_score += 3.0
            break

    # Desired trait not present in optimal combo
    if desired not in best_traits:
        trait_trap_score += 2.0

    trait_trap_score = min(10.0, trait_trap_score)

    # ── Inviable penalty (heavier than v1) ────────────────────────────────────
    inviable_count = 0
    for i in range(10):
        for j, (lo, hi) in enumerate(ranges):
            v = int(attrs[i, j])
            if v + 10 + 10 < 3 * lo or v + 1 + 1 > 3 * hi:
                inviable_count += 1
                break

    inviable_penalty = inviable_count * 3  # was 1 in v1

    # ── Composite score ────────────────────────────────────────────────────────
    raw = (
        cognitive_load_score  * 0.35
        + near_optimal_score  * 0.30
        + averaging_trap_score * 0.20
        + trait_trap_score    * 0.15
    )
    # Subtract inviable penalty from normalized score (not raw)
    normalized = max(0.0, min(100.0, raw * 10 - inviable_penalty))

    if scenario_name == "Hadal Abyss":
        band = (
            "hadal"       if normalized >= 86 else
            "expert"      if normalized >= 76 else
            "advanced"    if normalized >= 51 else
            "intermediate" if normalized >= 26 else
            "beginner"
        )
    else:
        normalized = min(normalized, 85.0)
        band = (
            "expert"      if normalized >= 76 else
            "advanced"    if normalized >= 51 else
            "intermediate" if normalized >= 26 else
            "beginner"
        )

    return {
        "normalized_score":     normalized,
        "difficulty_band":      band,
        "cognitive_load_count": cognitive_load_count,
        "near_optimal_count":   near_optimal_count,
        "averaging_trap_count": averaging_trap_count,
        "trait_trap_score":     round(trait_trap_score, 2),
        "inviable_count":       inviable_count,
        # Legacy fields — kept for JSON schema compatibility
        "near_miss_count":      near_optimal_count,
        "desired_trap":         desired not in best_traits,
        "undesired_bait":       undesired in best_traits,
    }


# ── Seeded pool batch generation ───────────────────────────────────────────────

def generate_seed_batch(
    B:      int,
    ranges: list,
    d_idx:  int,
    u_idx:  int,
    tier:   str,
) -> tuple:
    """
    Hybrid generation:
    1) Generate trait list for all 10 microbes (constrained)
    2) Seed 3 microbes with in-range attributes (optimal triple)
    3) Generate remaining 7 microbes in plausible zone (±3 of boundaries)
       — no more fully-random 1-10 values
    4) Shuffle all 10 together
    """
    all_traits = _make_trait_lists(B, d_idx, u_idx)
    all_attrs  = np.empty((B, 10, 3), dtype=np.int32)

    for b in range(B):
        retry = 0
        while True:
            retry += 1
            trait_row    = all_traits[b]
            combo_traits = trait_row[COMBO_IDX]

            desired_present  = np.any(combo_traits == d_idx, axis=1)
            undesired_present = np.any(combo_traits == u_idx, axis=1)

            if tier == "easy":
                valid = desired_present & (~undesired_present)
            elif tier == "medium":
                valid = (~desired_present) & (~undesired_present)
            elif tier == "hard":
                valid = (~desired_present) & (undesired_present)
            else:
                raise ValueError(f"Unknown tier '{tier}'")

            valid_idx = np.where(valid)[0]
            if valid_idx.size > 0:
                seed_combo = COMBO_IDX[valid_idx[0]]
                break

            if retry % 10 == 0:
                print(f"  [seed-gen] retry {retry} for pool {b+1}/{B} (tier={tier})")
            all_traits[b] = _make_trait_lists(1, d_idx, u_idx)[0]

        # Seed triple: in-range attributes
        for j, (lo, hi) in enumerate(ranges):
            all_attrs[b, seed_combo, j] = np.random.randint(lo, hi + 1, size=3)

        # Remaining 7: plausible zone (±3 of boundaries) — NOT fully random
        remaining_mask = np.ones(10, dtype=bool)
        remaining_mask[seed_combo] = False
        remaining_idx = np.where(remaining_mask)[0]

        for i in remaining_idx:
            for j, (lo, hi) in enumerate(ranges):
                all_attrs[b, i, j] = plausible_value(lo, hi)

        # Shuffle traits and attributes together
        perm = np.random.rand(10).argsort()
        all_traits[b]  = trait_row[perm]
        all_attrs[b]   = all_attrs[b, perm, :]

    return all_attrs, all_traits


def generate_hadal_seed_batch(
    B:       int,
    ranges:  list,
    d_idx:   int,
    u_idx:   int,
    subtype: tuple,
) -> tuple:
    """
    Hadal generation — all 10 microbes in tight plausible zone (±2 of boundaries).
    Much stricter than v1 to ensure no obvious rejects exist.
    """
    target_max, want_desired_trap, want_undesired_bait = subtype
    attrs_b  = np.empty((B, 10, 3), dtype=np.int32)
    traits_b = np.empty((B, 10), dtype=np.int32)

    for b in range(B):
        # Trait list with subtype constraints
        while True:
            tr    = _make_trait_lists(1, d_idx, u_idx)[0]
            seed3 = tr[:3]
            if want_desired_trap  and np.any(seed3 == d_idx):
                continue
            if want_undesired_bait and not np.any(seed3 == u_idx):
                continue
            break

        attrs = np.empty((10, 3), dtype=np.int32)

        # Seed triple: guide toward target max score
        fail_attrs  = 0 if target_max == 100 else (1 if target_max == 80 else 2)
        fail_indices = random.sample([0, 1, 2], k=fail_attrs) if fail_attrs else []

        for j, (lo, hi) in enumerate(ranges):
            if j in fail_indices:
                # Force out-of-range mean but keep value in tight plausible zone
                if random.random() < 0.5:
                    bad = min(10, hi + 1)  # just outside hi
                else:
                    bad = max(1, lo - 1)   # just outside lo
                attrs[:3, j] = bad
            else:
                attrs[:3, j] = np.random.randint(lo, hi + 1, size=3)

        # All other 7 microbes: tight plausible zone ±2 only
        # (stricter than non-hadal ±3 to maximise cognitive load)
        for i in range(3, 10):
            for j, (lo, hi) in enumerate(ranges):
                tight_zone = list(range(max(1, lo - 2), min(10, hi + 2) + 1))
                attrs[i, j] = random.choice(tight_zone)

        # Shuffle
        perm = np.random.rand(10).argsort()
        traits_b[b] = tr[perm]
        attrs_b[b]  = attrs[perm]

    return attrs_b, traits_b


# ── Pool object helpers ────────────────────────────────────────────────────────

def build_microbes(attrs: np.ndarray, traits: np.ndarray) -> list:
    return [
        {
            "id":       f"M{k + 1:03d}",
            "name":     f"{random.choice(PREFIXES)} {random.choice(SUFFIXES)}",
            "Mobility": int(attrs[k, 0]),
            "Agility":  int(attrs[k, 1]),
            "Size":     int(attrs[k, 2]),
            "trait":    TRAITS[int(traits[k])],
        }
        for k in range(10)
    ]


def get_best_combos(
    microbes:  list,
    scores:    np.ndarray,
    max_score: int,
) -> list:
    best_idx = np.where(scores == max_score)[0][:1]
    return [[microbes[j]["id"] for j in COMBO_IDX[ci]] for ci in best_idx]


def build_pool_object(
    key:         str,
    tier:        str,
    pool_num:    int,
    max_s:       int,
    microbes:    list,
    best_combos: list,
    hd:          dict,
) -> dict:
    return {
        "pool_id":          f"{key}_{tier}_{pool_num:02d}",
        "max_score":        max_s,
        "difficulty":       tier,
        "microbes":         microbes,
        "best_combinations": best_combos,
        "difficulty_score":  round(float(hd["normalized_score"]), 1),
        "difficulty_band":   hd["difficulty_band"],
        # Legacy fields for JSON schema compatibility
        "near_miss_count":  int(hd["near_miss_count"]),
        "desired_trap":     bool(hd["desired_trap"]),
        "undesired_bait":   bool(hd["undesired_bait"]),
    }


# ── Utilities ──────────────────────────────────────────────────────────────────

def scenario_key(name: str) -> str:
    return name.lower().replace(" ", "_")


def needs_more(found: dict) -> bool:
    return any(
        len(found[t]) < found["_targets"][t]
        for t in found["_targets"]
    )


# ── Per-scenario generation ────────────────────────────────────────────────────

def generate_pools_for_scenario(scenario: dict) -> dict:
    name   = scenario["name"]
    key    = scenario_key(name)
    d_idx  = TRAITS.index(scenario["desired_trait"])
    u_idx  = TRAITS.index(scenario["undesired_trait"])
    ranges = [
        (scenario["attributes"][a]["min"], scenario["attributes"][a]["max"])
        for a in ATTRIBUTES
    ]

    tier_targets      = {"hadal": 20} if name == "Hadal Abyss" else dict(BASE_TIER_TARGETS)
    found             = {t: [] for t in tier_targets}
    found["_targets"] = tier_targets
    tier_attempts     = {t: 0  for t in tier_targets}
    tier_fallback     = {"hard": False}
    hb_mark           = {t: 0  for t in tier_targets}
    hadal_sub_counts  = {k: 0  for k in HADAL_SUBTYPE_TARGETS}

    while needs_more(found):
        for tier in tier_targets:
            if len(found[tier]) >= tier_targets[tier]:
                continue

            use_seed = not tier_fallback.get(tier, False)

            if tier == "hadal":
                remaining_subtypes = [
                    k for k, tgt in HADAL_SUBTYPE_TARGETS.items()
                    if hadal_sub_counts[k] < tgt
                ]
                if not remaining_subtypes:
                    continue
                chosen_subtype = random.choice(remaining_subtypes)
                attrs_b, traits_b = generate_hadal_seed_batch(
                    MINI_BATCH, ranges, d_idx, u_idx, chosen_subtype
                )
            elif use_seed:
                attrs_b, traits_b = generate_seed_batch(
                    MINI_BATCH, ranges, d_idx, u_idx, tier
                )
            else:
                # Fallback: plausible zone random (not fully 1-10 random)
                attrs_b = np.array([
                    [[plausible_value(lo, hi) for lo, hi in ranges]
                     for _ in range(10)]
                    for _ in range(MINI_BATCH)
                ], dtype=np.int32)
                traits_b = np.random.randint(0, 4, size=(MINI_BATCH, 10), dtype=np.int32)

            scores_b     = score_batch(attrs_b, traits_b, ranges, d_idx, u_idx)
            max_scores_b = scores_b.max(axis=1)
            counts_b     = (scores_b == max_scores_b[:, None]).sum(axis=1)
            tier_attempts[tier] += MINI_BATCH

            for i in range(MINI_BATCH):
                if len(found[tier]) >= tier_targets[tier]:
                    break

                max_s    = int(max_scores_b[i])
                microbes = build_microbes(attrs_b[i], traits_b[i])
                hd       = compute_human_difficulty(
                    microbes, scores_b[i], max_s, scenario, name
                )
                actual_tier = classify(max_s, int(counts_b[i]), name, hd)
                if actual_tier != tier:
                    continue

                if tier == "hadal":
                    subtype = (
                        max_s,
                        bool(hd["desired_trap"]),
                        bool(hd["undesired_bait"]),
                    )
                    if subtype not in HADAL_SUBTYPE_TARGETS:
                        continue
                    if hadal_sub_counts[subtype] >= HADAL_SUBTYPE_TARGETS[subtype]:
                        continue
                    hadal_sub_counts[subtype] += 1

                best_combos = get_best_combos(microbes, scores_b[i], max_s)
                pool_num    = len(found[tier]) + 1
                found[tier].append(
                    build_pool_object(key, tier, pool_num, max_s, microbes, best_combos, hd)
                )
                print(
                    f"  [{name}] {tier} {pool_num}/{tier_targets[tier]} "
                    f"found at attempt ~{tier_attempts[tier]:,} "
                    f"(cog={hd['cognitive_load_count']} "
                    f"near_opt={hd['near_optimal_count']} "
                    f"avg_traps={hd['averaging_trap_count']})"
                )

            # Fallback switch for hard tier
            if (
                tier in tier_fallback
                and not tier_fallback[tier]
                and tier_attempts[tier] >= FALLBACK_THRESHOLD
            ):
                tier_fallback[tier] = True
                print(
                    f"  [{name}] {tier}: switching to plausible-zone fallback "
                    f"after {tier_attempts[tier]:,} seeded attempts"
                )

            # Heartbeat
            new_mark = tier_attempts[tier] // 100_000
            if new_mark > hb_mark[tier] and len(found[tier]) < tier_targets[tier]:
                hb_mark[tier] = new_mark
                mode = "random" if tier_fallback.get(tier) else "seeded"
                print(
                    f"  [{name}] {tier} ({mode}): "
                    f"{tier_attempts[tier]:,} attempts, "
                    f"{len(found[tier])}/{tier_targets[tier]} found"
                )

    total = sum(tier_attempts.values())
    print(f"  Scenario '{name}' complete — {total:,} total attempts.")
    if name == "Hadal Abyss":
        print("  Hadal subtype breakdown:")
        for k, tgt in HADAL_SUBTYPE_TARGETS.items():
            print(f"    {k}: {hadal_sub_counts[k]}/{tgt}")

    del found["_targets"]
    return found


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json") as fh:
        data = json.load(fh)

    for scenario in data["scenarios"]:
        s_name = scenario.get("name", "<unknown>")
        attrs  = scenario.get("attributes", {})
        for a in ATTRIBUTES:
            if a not in attrs:
                raise ValueError(f"Scenario '{s_name}' missing attribute '{a}'")
            lo = attrs[a]["min"]
            hi = attrs[a]["max"]
            if (hi - lo) != 2:
                raise ValueError(
                    f"Scenario '{s_name}' attribute '{a}' "
                    f"has range {lo}-{hi}; expected max-min==2"
                )

    output:                dict = {}
    scenario_pool_counts:  dict = {}
    band_counts:           dict = {}
    hadal_breakdown_totals      = {k: 0 for k in HADAL_SUBTYPE_TARGETS}

    for scenario in data["scenarios"]:
        print(f"\n=== {scenario['name']} ===")
        scenario_output = generate_pools_for_scenario(scenario)
        output[scenario["name"]] = scenario_output

        pool_count = 0
        for tier_name, pools in scenario_output.items():
            if not isinstance(pools, list):
                continue
            pool_count += len(pools)
            for p in pools:
                band = p.get("difficulty_band")
                if band:
                    band_counts[band] = band_counts.get(band, 0) + 1
                if scenario["name"] == "Hadal Abyss" and tier_name == "hadal":
                    subtype = (
                        p.get("max_score"),
                        bool(p.get("desired_trap")),
                        bool(p.get("undesired_bait")),
                    )
                    if subtype in hadal_breakdown_totals:
                        hadal_breakdown_totals[subtype] += 1
        scenario_pool_counts[scenario["name"]] = pool_count

    out_path = script_dir / "pools.json"
    with open(out_path, "w") as fh:
        json.dump(output, fh, indent=2)

    print("\nGeneration summary:")
    for s_name, cnt in scenario_pool_counts.items():
        print(f"  {s_name}: {cnt} pools")

    print("  Difficulty band distribution:")
    for band in sorted(band_counts.keys()):
        print(f"    {band}: {band_counts[band]}")

    if "Hadal Abyss" in scenario_pool_counts:
        print("  Hadal Abyss subtype breakdown:")
        for subtype, cnt in hadal_breakdown_totals.items():
            print(
                f"    {subtype}: {cnt}/{HADAL_SUBTYPE_TARGETS[subtype]}"
            )

    print(f"\nAll done — pools.json written to {out_path}")


if __name__ == "__main__":
    main()