#!/usr/bin/env python3
"""
generate_pools.py

NumPy-batched microbe pool generation with exhaustively-validated scoring.

Seeded generation assigns traits first, chooses seed positions to target the tier,
then assigns attributes (seeded attributes in-range; remaining attributes random)
and shuffles the 10 positions together.
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
MINI_BATCH         = 500          # pools generated and scored per numpy call per tier
FALLBACK_THRESHOLD = 500_000      # seeded attempts before hard go pure-random

HADAL_SUBTYPE_TARGETS = {
    (100, False, False): 8,  # max_score, desired_trap, undesired_bait
    (80,  True,  False): 6,
    (80,  False, True):  3,
    (60,  True,  True):  3,
}

# C(10,3) = 120 index triples — precomputed once, reused everywhere
COMBO_IDX = np.array(list(itertools.combinations(range(10), 3)), dtype=np.int32)  # (120, 3)


# ── Vectorised batch scoring ───────────────────────────────────────────────────

def score_batch(
    attrs:         np.ndarray,   # (B, 10, 3) int32  — Mobility, Agility, Size
    traits:        np.ndarray,   # (B, 10)    int32  — trait index 0-3
    attr_ranges:   list,         # [(lo, hi), (lo, hi), (lo, hi)]
    desired_idx:   int,
    undesired_idx: int,
) -> np.ndarray:                 # (B, 120)   int32  — score per combo per pool
    """Score all 120 combinations for every pool in the batch at once."""
    combo_attrs = attrs[:, COMBO_IDX, :]     # (B, 120, 3, 3)
    means       = combo_attrs.mean(axis=2)   # (B, 120, 3)  — per-combo attribute means

    scores = np.full((len(attrs), 120), 100, dtype=np.int32)

    for j, (lo, hi) in enumerate(attr_ranges):
        out = (means[:, :, j] < lo) | (means[:, :, j] > hi)
        scores -= 20 * out.astype(np.int32)

    combo_traits  = traits[:, COMBO_IDX]                              # (B, 120, 3)
    no_desired    = ~np.any(combo_traits == desired_idx,   axis=2)   # (B, 120)
    has_undesired =  np.any(combo_traits == undesired_idx, axis=2)   # (B, 120)

    scores -= 20 * no_desired.astype(np.int32)
    scores -= 20 * has_undesired.astype(np.int32)

    return scores


# ── Classification ─────────────────────────────────────────────────────────────

def classify(
    max_score: int,
    count: int,
    scenario_name: str,
    difficulty: dict,
) -> Optional[str]:
    # Target tiers:
    # - easy:   max_score == 100 AND count == 1
    # - medium: max_score == 80  AND count == 1
    # - hard:   max_score == 60  AND count == 1
    if scenario_name == "Hadal Abyss":
        if (
            difficulty["near_miss_count"] >= 4
            and difficulty["inviable_count"] <= 1
            and count == 1
            and max_score in (100, 80, 60)
        ):
            return "hadal"
        return None

    if max_score == 100 and count == 1:
        return "easy"
    if max_score == 80 and count == 1:
        return "medium"
    if max_score == 60 and count == 1:
        return "hard"
    return None


# ── Constrained trait-list generation ─────────────────────────────────────────

def _make_trait_lists(B: int, d_idx: int, u_idx: int) -> np.ndarray:
    """
    Build B trait lists of length 10 with constraints:
    - desired appears at least once
    - undesired appears at least once
    - no trait appears more than 3 times
    Returns (B, 10) int32.
    """
    if d_idx == u_idx:
        raise ValueError("desired_trait and undesired_trait indices must differ")

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


# ── Seeded pool batch generation ───────────────────────────────────────────────

def _inviable_attr_count(values: np.ndarray, ranges: list) -> int:
    """Count attributes that are mathematically inviable for one microbe."""
    fails = 0
    for j, (lo, hi) in enumerate(ranges):
        v = int(values[j])
        if v + 10 + 10 < 3 * lo or v + 1 + 1 > 3 * hi:
            fails += 1
    return fails


def _range_lever_score(ranges: list) -> int:
    score = 0
    for lo, hi in ranges:
        if lo >= 4 and hi <= 6:
            score += 0
        elif (lo <= 3 and hi <= 3) or (lo >= 8 and hi >= 8):
            score += 1
        else:
            score += 2
    return score


def compute_difficulty(
    microbes: list,
    combo_scores: np.ndarray,
    optimal_score: int,
    scenario: dict,
    scenario_name: str,
) -> dict:
    ranges = [(scenario["attributes"][a]["min"], scenario["attributes"][a]["max"]) for a in ATTRIBUTES]
    attrs = np.array([[m["Mobility"], m["Agility"], m["Size"]] for m in microbes], dtype=np.int32)
    traits = [m["trait"] for m in microbes]
    desired = scenario["desired_trait"]
    undesired = scenario["undesired_trait"]

    # Lever 1: range score
    range_score = _range_lever_score(ranges)

    # Lever 2: near miss score
    target = optimal_score - 20
    near_idx = np.where(combo_scores == target)[0]
    weighted_sum = 0.0
    near_miss_count = 0
    for ci in near_idx:
        combo = COMBO_IDX[int(ci)]
        trio = attrs[combo]
        combo_has_qual = False
        for j, (lo, hi) in enumerate(ranges):
            attr_sum = int(trio[:, j].sum())
            lo_sum = 3 * lo
            hi_sum = 3 * hi
            if lo_sum <= attr_sum <= hi_sum:
                continue
            boundary = lo_sum if attr_sum < lo_sum else hi_sum
            distance = abs(attr_sum - boundary)
            if distance == 1:
                weighted_sum += 1.0
                combo_has_qual = True
            elif distance == 2:
                weighted_sum += 0.75
                combo_has_qual = True
        if combo_has_qual:
            near_miss_count += 1
    near_miss_score = min(weighted_sum * 4, 12)

    # Inviability per microbe (used by lever 3 and lever 5)
    inviable_flags = [_inviable_attr_count(attrs[i], ranges) > 0 for i in range(len(microbes))]
    inviable_count = sum(1 for f in inviable_flags if f)

    # Determine one optimal combo (accepted pools are count==1)
    best_idx = int(np.where(combo_scores == optimal_score)[0][0])
    best_combo = COMBO_IDX[best_idx]
    best_traits = {traits[i] for i in best_combo}

    # Lever 3: desired trait trap
    pool_has_desired = any(t == desired for t in traits)
    optimal_has_desired = desired in best_traits
    desired_trap = pool_has_desired and not optimal_has_desired
    desired_trap_score = 0
    if desired_trap:
        desired_microbes_idx = [i for i, t in enumerate(traits) if t == desired]
        bonus_count = max(0, len(desired_microbes_idx) - 1)
        desired_any_inviable = any(inviable_flags[i] for i in desired_microbes_idx)
        bonus_clean = 2 if not desired_any_inviable else 0
        desired_trap_score = 4 + bonus_count + bonus_clean

    # Lever 4: undesired bait
    undesired_bait = undesired in best_traits
    undesired_bait_score = 5 if undesired_bait else 0

    # Lever 5: inviable penalty
    inviable_penalty = inviable_count * 1

    raw_score = range_score + near_miss_score + desired_trap_score + undesired_bait_score - inviable_penalty
    raw_score = max(0, raw_score)

    if scenario_name == "Hadal Abyss":
        normalized = (raw_score / 31) * 100
    else:
        normalized = min((raw_score / 31) * 100, 85)

    if normalized < 26:
        band = "beginner"
    elif normalized < 51:
        band = "intermediate"
    elif normalized < 76:
        band = "advanced"
    elif normalized < 86:
        band = "expert"
    else:
        band = "hadal"

    return {
        "range_score": range_score,
        "near_miss_score": near_miss_score,
        "desired_trap_score": desired_trap_score,
        "undesired_bait_score": undesired_bait_score,
        "inviable_penalty": inviable_penalty,
        "raw_score": raw_score,
        "normalized_score": normalized,
        "difficulty_band": band,
        "near_miss_count": near_miss_count,
        "desired_trap": desired_trap,
        "undesired_bait": undesired_bait,
        "inviable_count": inviable_count,
    }

def generate_seed_batch(
    B: int,
    ranges: list,  # [(lo, hi), ...]  per attribute (3 attrs)
    d_idx: int,    # desired trait index
    u_idx: int,    # undesired trait index
    tier: str,     # "easy" | "medium" | "hard"
) -> tuple:         # (attrs (B,10,3) int32, traits (B,10) int32)
    """
    Trait-first seeded generation:
    1) Generate full trait list for 10 microbes.
    2) Choose 3 seed indices such that (for the target tier) the seed triple will
       land on the tier's max_score when attributes for those indices are in-range.
    3) Assign in-range attributes to those 3 seed microbes.
    4) Assign random attributes 1-10 to remaining 7 microbes.
    5) Shuffle all 10 positions together (traits and attributes move together).
    """
    all_traits = _make_trait_lists(B, d_idx, u_idx)  # (B,10)
    all_attrs = np.empty((B, 10, 3), dtype=np.int32)

    for b in range(B):
        retry = 0
        while True:
            retry += 1
            trait_row = all_traits[b]
            combo_traits = trait_row[COMBO_IDX]  # (120,3)

            desired_present = np.any(combo_traits == d_idx, axis=1)      # (120,)
            undesired_present = np.any(combo_traits == u_idx, axis=1)    # (120,)

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
                seed_combo = COMBO_IDX[valid_idx[0]]  # 3 indices in [0..9]
                break

            # No valid seed triple; regenerate traits and retry (per-pool).
            if retry % 10 == 0:
                print(f"  [seed-gen] retry {retry} for pool {b+1}/{B} (tier={tier})")
            all_traits[b] = _make_trait_lists(1, d_idx, u_idx)[0]

        # Step 3: assign in-range attributes to seed microbes (per-index values)
        for j, (lo, hi) in enumerate(ranges):
            all_attrs[b, seed_combo, j] = np.random.randint(lo, hi + 1, size=3)

        # Step 4: remaining 7 microbes random attrs 1-10
        remaining_mask = np.ones(10, dtype=bool)
        remaining_mask[seed_combo] = False
        rand_attrs = np.random.randint(1, 11, size=(7, 3), dtype=np.int32)
        all_attrs[b, remaining_mask, :] = rand_attrs

        # Step 5: shuffle traits and attributes together for this pool
        perm = np.random.rand(10).argsort()
        all_traits[b] = trait_row[perm]
        all_attrs[b] = all_attrs[b, perm, :]

    return all_attrs, all_traits


def generate_hadal_seed_batch(
    B: int,
    ranges: list,
    d_idx: int,
    u_idx: int,
    subtype: tuple[int, bool, bool],  # (target_max, desired_trap, undesired_bait)
) -> tuple:
    """
    Hadal-specific seeded generation:
    - traits first
    - 6 microbes clustered near range boundaries
    - subtype-guided trait constraints on seed trio
    - remaining 4 random
    - shuffle together
    """
    target_max, want_desired_trap, want_undesired_bait = subtype
    attrs_b = np.empty((B, 10, 3), dtype=np.int32)
    traits_b = np.empty((B, 10), dtype=np.int32)

    for b in range(B):
        # Step 1: trait list with subtype constraints on the first seed trio
        while True:
            tr = _make_trait_lists(1, d_idx, u_idx)[0]
            seed3 = tr[:3]
            if want_desired_trap and np.any(seed3 == d_idx):
                continue
            if want_undesired_bait and not np.any(seed3 == u_idx):
                continue
            break

        # Step 2: 6 seeded microbes near boundaries
        attrs = np.random.randint(1, 11, size=(10, 3), dtype=np.int32)  # default random
        for i in range(6):
            for j, (lo, hi) in enumerate(ranges):
                vals = [lo - 2, lo - 1, lo, lo + 1, hi - 1, hi, hi + 1, hi + 2]
                clipped = [min(10, max(1, v)) for v in vals]
                attrs[i, j] = int(random.choice(clipped))

        # Step 3: guide first 3 microbes toward target score profile
        fail_attrs = 0 if target_max == 100 else (1 if target_max == 80 else 2)
        fail_indices = random.sample([0, 1, 2], k=fail_attrs) if fail_attrs else []
        for j, (lo, hi) in enumerate(ranges):
            if j in fail_indices:
                # Force out-of-range mean on this attribute for seed triple
                if random.random() < 0.5:
                    bad = min(10, hi + 2)
                else:
                    bad = max(1, lo - 2)
                attrs[:3, j] = bad
            else:
                attrs[:3, j] = np.random.randint(lo, hi + 1, size=3)

        # Step 4 already satisfied (remaining 4 random in attrs init)

        # Step 5: shuffle all 10 positions together
        perm = np.random.rand(10).argsort()
        traits_b[b] = tr[perm]
        attrs_b[b] = attrs[perm]

    return attrs_b, traits_b


# ── Pool object helpers ────────────────────────────────────────────────────────

def build_microbes(attrs: np.ndarray, traits: np.ndarray) -> list:
    """Convert a single pool's numpy arrays into the output microbe list."""
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


def get_best_combos(microbes: list, scores: np.ndarray, max_score: int) -> list:
    """Return at most 1 combination that achieves max_score, as a list of microbe ids."""
    best_idx = np.where(scores == max_score)[0][:1]
    return [[microbes[j]["id"] for j in COMBO_IDX[ci]] for ci in best_idx]


def build_pool_object(
    key: str,
    tier: str,
    pool_num: int,
    max_s: int,
    microbes: list,
    best_combos: list,
    difficulty: dict,
) -> dict:
    return {
        "pool_id":            f"{key}_{tier}_{pool_num:02d}",
        "max_score":          max_s,
        "difficulty":         tier,
        "microbes":           microbes,
        "best_combinations":  best_combos,
        "difficulty_score":   round(float(difficulty["normalized_score"]), 1),
        "difficulty_band":    difficulty["difficulty_band"],
        "near_miss_count":    int(difficulty["near_miss_count"]),
        "desired_trap":       bool(difficulty["desired_trap"]),
        "undesired_bait":     bool(difficulty["undesired_bait"]),
    }


# ── Utilities ──────────────────────────────────────────────────────────────────

def scenario_key(name: str) -> str:
    return name.lower().replace(" ", "_")


def needs_more(found: dict) -> bool:
    return any(len(found[t]) < found["_targets"][t] for t in found["_targets"])


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

    tier_targets = {"hadal": 20} if name == "Hadal Abyss" else dict(BASE_TIER_TARGETS)

    found          = {t: []    for t in tier_targets}
    found["_targets"] = tier_targets
    tier_attempts  = {t: 0     for t in tier_targets}
    # Only hard has a fallback; easy and medium always use seeded
    tier_fallback  = {"hard": False}
    hb_mark        = {t: 0     for t in tier_targets}   # heartbeat milestone tracker

    hadal_sub_counts = {k: 0 for k in HADAL_SUBTYPE_TARGETS}

    while needs_more(found):
        for tier in tier_targets:
            if len(found[tier]) >= tier_targets[tier]:
                continue

            use_seed = not tier_fallback.get(tier, False)

            # ── Generate MINI_BATCH pools for this tier ────────────────────────
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
                attrs_b, traits_b = generate_seed_batch(MINI_BATCH, ranges, d_idx, u_idx, tier)
            else:
                attrs_b  = np.random.randint(1, 11, size=(MINI_BATCH, 10, 3), dtype=np.int32)
                traits_b = np.random.randint(0,  4, size=(MINI_BATCH, 10),    dtype=np.int32)

            scores_b     = score_batch(attrs_b, traits_b, ranges, d_idx, u_idx)
            max_scores_b = scores_b.max(axis=1)                                 # (B,)
            counts_b     = (scores_b == max_scores_b[:, None]).sum(axis=1)     # (B,)
            tier_attempts[tier] += MINI_BATCH

            # ── Accept any pool in the batch that matches this tier exactly ────
            for i in range(MINI_BATCH):
                if len(found[tier]) >= tier_targets[tier]:
                    break

                max_s       = int(max_scores_b[i])
                microbes    = build_microbes(attrs_b[i], traits_b[i])
                best_combos = get_best_combos(microbes, scores_b[i], max_s)
                difficulty  = compute_difficulty(microbes, scores_b[i], max_s, scenario, name)
                actual_tier = classify(max_s, int(counts_b[i]), name, difficulty)
                if actual_tier != tier:
                    continue

                if tier == "hadal":
                    subtype = (max_s, bool(difficulty["desired_trap"]), bool(difficulty["undesired_bait"]))
                    if subtype not in HADAL_SUBTYPE_TARGETS:
                        continue
                    if hadal_sub_counts[subtype] >= HADAL_SUBTYPE_TARGETS[subtype]:
                        continue
                    hadal_sub_counts[subtype] += 1

                pool_num = len(found[tier]) + 1
                found[tier].append(
                    build_pool_object(
                        key, tier, pool_num, max_s, microbes, best_combos, difficulty
                    )
                )
                print(
                    f"  [{name}] {tier} {pool_num}/{tier_targets[tier]} "
                    f"found at attempt ~{tier_attempts[tier]:,}"
                )

            # ── Fallback: switch hard to pure random after threshold ────────
            if (
                tier in tier_fallback
                and not tier_fallback[tier]
                and tier_attempts[tier] >= FALLBACK_THRESHOLD
            ):
                tier_fallback[tier] = True
                print(
                    f"  [{name}] {tier}: switching to pure-random fallback "
                    f"after {tier_attempts[tier]:,} seeded attempts"
                )

            # ── Heartbeat every 100k attempts per tier ─────────────────────────
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

    # remove internal marker key from output payload
    del found["_targets"]
    return found


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json") as fh:
        data = json.load(fh)

    # Validate scenario ranges strictly: max-min must equal 2 for all attributes.
    for scenario in data["scenarios"]:
        s_name = scenario.get("name", "<unknown>")
        attrs = scenario.get("attributes", {})
        for a in ATTRIBUTES:
            if a not in attrs:
                raise ValueError(f"Scenario '{s_name}' missing attribute '{a}'")
            lo = attrs[a]["min"]
            hi = attrs[a]["max"]
            if (hi - lo) != 2:
                raise ValueError(
                    f"Scenario '{s_name}' attribute '{a}' has range {lo}-{hi}; expected max-min==2"
                )

    output: dict = {}
    scenario_pool_counts: dict[str, int] = {}
    band_counts: dict[str, int] = {}
    hadal_breakdown_totals = {k: 0 for k in HADAL_SUBTYPE_TARGETS}

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
            print(f"    {subtype}: {cnt}/{HADAL_SUBTYPE_TARGETS[subtype]}")

    print(f"\nAll done — pools.json written to {out_path}")


if __name__ == "__main__":
    main()
