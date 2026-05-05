#!/usr/bin/env python3
"""
validate_pools.py
Independent validation of pools.json against scenarios.json.

Scoring is re-implemented from scratch here so that any bug shared between
this file and generate_pools.py cannot silently pass validation.
"""

import json
import itertools
from pathlib import Path

VALID_TRAITS = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES   = ["Mobility", "Agility", "Size"]

TIER_EXPECTED_COMBO_COUNT = {
    "easy":   1,
    "medium": 1,
    "hard":   1,
}
TIER_EXPECTED_MAX = {
    "easy":   100,
    "medium":  80,
    "hard":    60,
}


# ── Independent scoring implementation ────────────────────────────────────────

def score_combo(trio, scenario):
    """Score one combination of 3 microbes. Returns integer 0-100."""
    score = 100
    for attr in ATTRIBUTES:
        mean_val = sum(m[attr] for m in trio) / 3.0
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if not (lo <= mean_val <= hi):
            score -= 20
    trait_set = {m["trait"] for m in trio}
    if scenario["desired_trait"] not in trait_set:
        score -= 20
    if scenario["undesired_trait"] in trait_set:
        score -= 20
    return score


def score_all_combos(microbes, scenario):
    """
    Evaluate all C(n,3) combinations.
    Returns (max_score, count_at_max, combo_scores) where combo_scores maps
    tuple-of-ids to score.
    """
    combo_scores = {}
    for triple in itertools.combinations(range(len(microbes)), 3):
        trio = [microbes[i] for i in triple]
        ids  = tuple(m["id"] for m in trio)
        combo_scores[ids] = score_combo(trio, scenario)

    max_score     = max(combo_scores.values())
    count_at_max  = sum(1 for s in combo_scores.values() if s == max_score)
    return max_score, count_at_max, combo_scores


def classify(max_score, count_at_max):
    if max_score == 100 and count_at_max == 1:
        return "easy"
    if max_score == 80 and count_at_max == 1:
        return "medium"
    if max_score == 60 and count_at_max == 1:
        return "hard"
    return None


# ── Per-pool validation ────────────────────────────────────────────────────────

def validate_pool(pool_obj, scenario):
    """
    Run all checks for one pool.
    Returns a list of failure strings (empty = all passed).
    """
    failures = []
    microbes         = pool_obj.get("microbes", [])
    reported_max     = pool_obj.get("max_score")
    reported_diff    = pool_obj.get("difficulty")
    reported_combos  = pool_obj.get("best_combinations", [])

    # ── Check 1: exactly 10 microbes ──────────────────────────────────────────
    if len(microbes) != 10:
        failures.append(
            f"[Check 1] Expected 10 microbes, found {len(microbes)}"
        )

    # ── Check 6: all attribute values in 1-10 ─────────────────────────────────
    for m in microbes:
        for attr in ATTRIBUTES:
            val = m.get(attr)
            if not isinstance(val, int) or not (1 <= val <= 10):
                failures.append(
                    f"[Check 6] Microbe {m.get('id', '?')} — "
                    f"{attr}={val!r} is outside 1-10"
                )

    # ── Check 7: trait is one of the 4 valid values ───────────────────────────
    for m in microbes:
        trait = m.get("trait")
        if trait not in VALID_TRAITS:
            failures.append(
                f"[Check 7] Microbe {m.get('id', '?')} — "
                f"invalid trait {trait!r} (valid: {VALID_TRAITS})"
            )

    # ── Checks 2/3/4: re-score and classify ───────────────────────────────────
    # Run even if microbe count is wrong; score as many combos as possible.
    actual_max, actual_count, combo_scores = score_all_combos(microbes, scenario)
    actual_tier = classify(actual_max, actual_count)

    # Check 3: reported max_score
    if reported_max != actual_max:
        failures.append(
            f"[Check 3] Reported max_score={reported_max}, "
            f"actual max_score={actual_max}"
        )

    # Check 4: reported difficulty / classification
    if reported_diff != actual_tier:
        failures.append(
            f"[Check 4] Reported difficulty='{reported_diff}', "
            f"actual classification='{actual_tier}' "
            f"(actual max={actual_max}, combos at max={actual_count})"
        )

    # ── Check 5: best_combinations are valid and achieve max_score ─────────────
    microbe_ids = {m["id"] for m in microbes}

    if len(reported_combos) != 1:
        failures.append(
            f"[Check 5] Expected exactly 1 "
            f"best_combination, found "
            f"{len(reported_combos)}"
        )

    for entry_num, combo_ids in enumerate(reported_combos, start=1):
        prefix = f"[Check 5] best_combinations[{entry_num}]"

        # Must have exactly 3 ids
        if len(combo_ids) != 3:
            failures.append(
                f"{prefix} has {len(combo_ids)} id(s), expected 3: {combo_ids}"
            )
            continue

        # All ids must be distinct
        if len(set(combo_ids)) != 3:
            failures.append(
                f"{prefix} contains duplicate microbe ids: {combo_ids}"
            )
            continue

        # All ids must belong to this pool
        unknown = [mid for mid in combo_ids if mid not in microbe_ids]
        if unknown:
            failures.append(
                f"{prefix} references id(s) not in pool: {unknown}"
            )
            continue

        # The combo must actually achieve the reported max_score
        # Score it directly (order-independent: score_combo handles any order)
        trio = [next(m for m in microbes if m["id"] == mid) for mid in combo_ids]
        combo_sc = score_combo(trio, scenario)
        if combo_sc != reported_max:
            failures.append(
                f"{prefix} {combo_ids} scores {combo_sc}, "
                f"but reported max_score is {reported_max}"
            )

    return failures


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json") as fh:
        scenarios_data = json.load(fh)

    with open(script_dir / "pools.json") as fh:
        pools_data = json.load(fh)

    scenario_by_name = {s["name"]: s for s in scenarios_data["scenarios"]}

    total_checked = 0
    total_passed  = 0
    all_failures  = []   # list of (pool_id, [failure strings])

    for scenario_name, tiers in pools_data.items():
        print(f"\n=== {scenario_name} ===")

        if scenario_name not in scenario_by_name:
            print(f"  ERROR: scenario not found in scenarios.json — skipping")
            continue

        scenario = scenario_by_name[scenario_name]

        for tier_name in ("easy", "medium", "hard"):
            pools = tiers.get(tier_name, [])
            for pool_obj in pools:
                pool_id = pool_obj.get("pool_id", "<no pool_id>")
                total_checked += 1

                failures = validate_pool(pool_obj, scenario)

                if not failures:
                    total_passed += 1
                    print(f"  [PASS] {pool_id}")
                else:
                    all_failures.append((pool_id, failures))
                    print(f"  [FAIL] {pool_id}")
                    for msg in failures:
                        print(f"           {msg}")

    # ── Summary ───────────────────────────────────────────────────────────────
    total_failed = total_checked - total_passed
    width = 54

    print()
    print("=" * width)
    print("SUMMARY")
    print("=" * width)
    print(f"  Total checked : {total_checked}")
    print(f"  Passed        : {total_passed}")
    print(f"  Failed        : {total_failed}")

    if all_failures:
        print()
        print("FAILURES")
        print("-" * width)
        for pool_id, failures in all_failures:
            print(f"  {pool_id}")
            for msg in failures:
                print(f"    - {msg}")
    else:
        print()
        print("  All pools passed validation.")

    print("=" * width)


if __name__ == "__main__":
    main()
