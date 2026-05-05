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

TIER_TARGETS       = {"easy": 15, "medium": 10, "hard": 5}
MINI_BATCH         = 500          # pools generated and scored per numpy call per tier
FALLBACK_THRESHOLD = 500_000      # seeded attempts before hard go pure-random

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

def classify(max_score: int, count: int) -> Optional[str]:
    # Target tiers:
    # - easy:   max_score == 100 AND count == 1
    # - medium: max_score == 80  AND count == 1
    # - hard:   max_score == 60  AND count == 1
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


# ── Utilities ──────────────────────────────────────────────────────────────────

def scenario_key(name: str) -> str:
    return name.lower().replace(" ", "_")


def needs_more(found: dict) -> bool:
    return any(len(found[t]) < TIER_TARGETS[t] for t in TIER_TARGETS)


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

    found          = {t: []    for t in TIER_TARGETS}
    # Preserve output shape expected by the app; very_hard pools are not generated.
    found["very_hard"] = []
    tier_attempts  = {t: 0     for t in TIER_TARGETS}
    # Only hard has a fallback; easy and medium always use seeded
    tier_fallback  = {"hard": False}
    hb_mark        = {t: 0     for t in TIER_TARGETS}   # heartbeat milestone tracker

    while needs_more(found):
        for tier in TIER_TARGETS:
            if len(found[tier]) >= TIER_TARGETS[tier]:
                continue

            use_seed = not tier_fallback.get(tier, False)

            # ── Generate MINI_BATCH pools for this tier ────────────────────────
            if use_seed:
                attrs_b, traits_b = generate_seed_batch(
                    MINI_BATCH, ranges, d_idx, u_idx, tier
                )
            else:
                attrs_b  = np.random.randint(1, 11, size=(MINI_BATCH, 10, 3), dtype=np.int32)
                traits_b = np.random.randint(0,  4, size=(MINI_BATCH, 10),    dtype=np.int32)

            scores_b     = score_batch(attrs_b, traits_b, ranges, d_idx, u_idx)
            max_scores_b = scores_b.max(axis=1)                                 # (B,)
            counts_b     = (scores_b == max_scores_b[:, None]).sum(axis=1)     # (B,)
            tier_attempts[tier] += MINI_BATCH

            # ── Accept any pool in the batch that matches this tier exactly ────
            for i in range(MINI_BATCH):
                if len(found[tier]) >= TIER_TARGETS[tier]:
                    break
                if classify(int(max_scores_b[i]), int(counts_b[i])) != tier:
                    continue

                max_s       = int(max_scores_b[i])
                microbes    = build_microbes(attrs_b[i], traits_b[i])
                best_combos = get_best_combos(microbes, scores_b[i], max_s)

                pool_num = len(found[tier]) + 1
                found[tier].append({
                    "pool_id":            f"{key}_{tier}_{pool_num:02d}",
                    "max_score":          max_s,
                    "difficulty":         tier,
                    "microbes":           microbes,
                    "best_combinations":  best_combos,
                })
                print(
                    f"  [{name}] {tier} {pool_num}/{TIER_TARGETS[tier]} "
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
            if new_mark > hb_mark[tier] and len(found[tier]) < TIER_TARGETS[tier]:
                hb_mark[tier] = new_mark
                mode = "random" if tier_fallback.get(tier) else "seeded"
                print(
                    f"  [{name}] {tier} ({mode}): "
                    f"{tier_attempts[tier]:,} attempts, "
                    f"{len(found[tier])}/{TIER_TARGETS[tier]} found"
                )

    total = sum(tier_attempts.values())
    print(f"  Scenario '{name}' complete — {total:,} total attempts.")
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
    for scenario in data["scenarios"]:
        print(f"\n=== {scenario['name']} ===")
        output[scenario["name"]] = generate_pools_for_scenario(scenario)

    out_path = script_dir / "pools.json"
    with open(out_path, "w") as fh:
        json.dump(output, fh, indent=2)

    print(f"\nAll done — pools.json written to {out_path}")


if __name__ == "__main__":
    main()
