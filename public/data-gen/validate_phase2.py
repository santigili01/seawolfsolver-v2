#!/usr/bin/env python3

import json
import itertools
from pathlib import Path


TRAITS = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES = ["Mobility", "Agility", "Size"]


def score_pool(microbes, scenario):
    """Check all C(10,3)=120 combos. Returns (max_score, best_combo_ids)."""
    best_score = -1
    best_ids = []
    for triple in itertools.combinations(range(len(microbes)), 3):
        trio = [microbes[i] for i in triple]
        score = 100
        for attr in ATTRIBUTES:
            mean = sum(m[attr] for m in trio) / 3
            lo = scenario["attributes"][attr]["min"]
            hi = scenario["attributes"][attr]["max"]
            if not (lo <= mean <= hi):
                score -= 20
        trait_set = {m["trait"] for m in trio}
        if scenario["desired_trait"] not in trait_set:
            score -= 20
        if scenario["undesired_trait"] in trait_set:
            score -= 20
        if score > best_score:
            best_score = score
            best_ids = [m["id"] for m in trio]
    return best_score, best_ids


def is_inviable(microbe, scenario):
    """Returns True if for any attribute:
    value + 10 + 10 < 3 * range_min OR
    value + 1 + 1 > 3 * range_max
    """
    for attr in ATTRIBUTES:
        value = microbe[attr]
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if value + 10 + 10 < 3 * lo:
            return True
        if value + 1 + 1 > 3 * hi:
            return True
    return False


def attributes_in_range(microbe, scenario):
    """Count individual attribute values within scenario range. Returns int 0-3."""
    count = 0
    for attr in ATTRIBUTES:
        value = microbe[attr]
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if lo <= value <= hi:
            count += 1
    return count


def count_conditions(microbe, scenario):
    """Count how many of 5 conditions satisfied."""
    count = attributes_in_range(microbe, scenario)
    if microbe["trait"] == scenario["desired_trait"]:
        count += 1
    if microbe["trait"] != scenario["undesired_trait"]:
        count += 1
    return count


def compute_neutral_score(microbe, scenario):
    """attributes_in_range/3 + desired-trait-and-not-inviable bonus."""
    return (attributes_in_range(microbe, scenario) / 3) + (
        1 if microbe["trait"] == scenario["desired_trait"] and not is_inviable(microbe, scenario) else 0
    )


def expected_classification(microbe, scenario, is_optimal):
    if is_optimal:
        return "optimal"
    if is_inviable(microbe, scenario):
        return "negative"
    if microbe["trait"] == scenario["undesired_trait"]:
        return "negative"
    return "neutral"


def validate_scenario(p2, source_pool, scenario):
    """
    Validate one phase2 scenario.
    Returns list of failure strings.
    """
    failures = []

    choose_sets = p2.get("choose_sets", [])
    preloaded = p2.get("preloaded_microbes", [])
    source_microbes = source_pool.get("microbes", [])
    source_ids = {m["id"] for m in source_microbes}
    source_best_ids = set(source_pool["best_combinations"][0] if source_pool.get("best_combinations") else [])

    # CHECK 1 — STRUCTURE
    if len(choose_sets) != 4:
        failures.append(f"[Check 1] choose_sets expected 4, found {len(choose_sets)}")
    if len(preloaded) != 6:
        failures.append(f"[Check 1] preloaded_microbes expected 6, found {len(preloaded)}")

    all_ids = []
    all_microbes = []
    for m in preloaded:
        all_ids.append(m.get("id"))
        all_microbes.append(m)
    for r_idx, cs in enumerate(choose_sets, start=1):
        candidates = cs.get("candidates", [])
        if len(candidates) != 3:
            failures.append(f"[Check 1] round {r_idx} expected 3 candidates, found {len(candidates)}")
        for c in candidates:
            microbe = c.get("microbe", {})
            all_ids.append(microbe.get("id"))
            all_microbes.append(microbe)

    if len(all_ids) != len(set(all_ids)):
        failures.append("[Check 1] duplicate microbe IDs across preloaded + candidates")

    for m in all_microbes:
        trait = m.get("trait")
        mid = m.get("id", "<no-id>")
        if trait not in TRAITS:
            failures.append(f"[Check 1] invalid trait for {mid}: {trait!r}")
        for attr in ATTRIBUTES:
            v = m.get(attr)
            if not isinstance(v, int) or not (1 <= v <= 10):
                failures.append(f"[Check 1] invalid {attr} for {mid}: {v!r} (expected int 1-10)")

    # CHECK 2 — REMOVED MICROBES MATCH SOURCE POOL
    preloaded_ids = {m.get("id") for m in preloaded}
    for pid in preloaded_ids:
        if pid not in source_ids:
            failures.append(f"[Check 2] preloaded microbe {pid} not found in source pool")

    removed_from_source = []
    for r_idx, cs in enumerate(choose_sets, start=1):
        in_source = [
            c.get("microbe", {}).get("id")
            for c in cs.get("candidates", [])
            if c.get("microbe", {}).get("id") in source_ids
        ]
        if len(in_source) != 1:
            failures.append(
                f"[Check 2] round {r_idx} expected exactly 1 candidate id from source pool, found {len(in_source)}"
            )
        for sid in in_source:
            if sid not in source_ids:
                failures.append(f"[Check 2] removed microbe {sid} not found in source pool")
            removed_from_source.append(sid)

    rebuilt_ids = preloaded_ids.union(set(removed_from_source))
    if rebuilt_ids != source_ids:
        failures.append(
            "[Check 2] preloaded + removed-source IDs do not exactly match source pool IDs"
        )

    # CHECK 3 — OPTIMAL COUNT AND VALIDITY
    for r_idx, cs in enumerate(choose_sets, start=1):
        optimal_cands = [c for c in cs.get("candidates", []) if c.get("classification") == "optimal"]
        if len(optimal_cands) > 1:
            failures.append(f"[Check 3] round {r_idx} has more than 1 optimal candidate")
        for c in optimal_cands:
            mid = c.get("microbe", {}).get("id")
            if mid not in source_best_ids:
                failures.append(
                    f"[Check 3] round {r_idx} optimal candidate {mid} not in source best combination"
                )

    # CHECK 3b — AT LEAST ONE OPTIMAL ROUND
    optimal_round_count = sum(
        1 for cs in choose_sets if any(c.get("classification") == "optimal" for c in cs.get("candidates", []))
    )
    if optimal_round_count < 1:
        failures.append(
            "[Check 3b] No choose set contains an optimal candidate — at least 1 required"
        )

    # CHECK 4 — CLASSIFICATION CORRECTNESS
    for r_idx, cs in enumerate(choose_sets, start=1):
        for c in cs.get("candidates", []):
            m = c.get("microbe", {})
            mid = m.get("id")
            is_optimal = c.get("classification") == "optimal"
            expected = expected_classification(m, scenario, is_optimal)
            actual = c.get("classification")
            if expected != actual:
                failures.append(
                    f"[Check 4] round {r_idx}, {mid}: classification mismatch expected={expected}, actual={actual}"
                )

    # CHECK 5 — NEUTRAL SCORES
    for r_idx, cs in enumerate(choose_sets, start=1):
        for c in cs.get("candidates", []):
            if c.get("classification") != "neutral":
                continue
            m = c.get("microbe", {})
            mid = m.get("id")
            expected = compute_neutral_score(m, scenario)
            actual = c.get("neutral_score")
            if actual is None:
                failures.append(f"[Check 5] round {r_idx}, {mid}: neutral_score is missing")
                continue
            if abs(float(actual) - float(expected)) > 0.001:
                failures.append(
                    f"[Check 5] round {r_idx}, {mid}: neutral_score mismatch expected={expected:.3f}, actual={actual}"
                )

    # CHECK 6 — DECOY QUALITY WHEN OPTIMAL EXISTS
    for r_idx, cs in enumerate(choose_sets, start=1):
        candidates = cs.get("candidates", [])
        optimal = next((c for c in candidates if c.get("classification") == "optimal"), None)
        if optimal is None:
            continue

        opt_m = optimal["microbe"]
        opt_count = count_conditions(opt_m, scenario)
        opt_has_desired = opt_m.get("trait") == scenario["desired_trait"]

        for c in candidates:
            if c is optimal:
                continue
            m = c.get("microbe", {})
            cond = count_conditions(m, scenario)
            if cond >= opt_count:
                failures.append(
                    f"[Check 6] round {r_idx}, {m.get('id')}: decoy conditions {cond} not < optimal {opt_count}"
                )
            if opt_has_desired and m.get("trait") == scenario["desired_trait"] and not is_inviable(m, scenario):
                failures.append(
                    f"[Check 6] round {r_idx}, {m.get('id')}: has desired trait while optimal has desired (must be inviable)"
                )

    # CHECK 7 — NEUTRAL GUARANTEE WHEN NO OPTIMAL
    for r_idx, cs in enumerate(choose_sets, start=1):
        candidates = cs.get("candidates", [])
        has_optimal = any(c.get("classification") == "optimal" for c in candidates)
        if has_optimal:
            continue
        if not any(c.get("classification") == "neutral" for c in candidates):
            failures.append(f"[Check 7] round {r_idx}: no optimal and all candidates are negative")

    # CHECK 8 — TRAP ROUND ORDERING
    if p2.get("has_trait_trap") or p2.get("has_undesired_bait"):
        trap_rounds = [cs.get("round") for cs in choose_sets if cs.get("is_trap_round") is True]
        if len(trap_rounds) != 1:
            failures.append(f"[Check 8] expected exactly 1 trap round, found {len(trap_rounds)}")
        elif trap_rounds[0] != 4:
            failures.append(f"[Check 8] trap round must be round 4, found round {trap_rounds[0]}")

    # CHECK 9 — OPTIMAL MICROBES SATISFY 2+ CONDITIONS
    for r_idx, cs in enumerate(choose_sets, start=1):
        for c in cs.get("candidates", []):
            if c.get("classification") != "optimal":
                continue
            m = c.get("microbe", {})
            cond = count_conditions(m, scenario)
            if cond < 2:
                failures.append(
                    f"[Check 9] round {r_idx}, {m.get('id')}: optimal has only {cond} conditions (<2)"
                )

    # CHECK 10 — 81-PATH VALIDATION
    original_max = p2.get("original_max_score")
    for path in itertools.product(range(3), repeat=4):
        if len(choose_sets) < 4:
            break
        try:
            player_picks = [choose_sets[r]["candidates"][path[r]]["microbe"] for r in range(4)]
        except Exception:
            failures.append("[Check 10] invalid choose_sets/candidates structure for 81-path traversal")
            break
        player_pool = preloaded + player_picks
        player_max = score_pool(player_pool, scenario)[0]
        if player_max > original_max:
            failures.append(
                f"[Check 10] path={path} exceeds original_max_score: {player_max} > {original_max}"
            )
            break

    # CHECK 11 — OPTIMAL PATH ACHIEVES OPTIMAL_MAX
    optimal_picks = []
    for cs in choose_sets:
        opt = next((c for c in cs.get("candidates", []) if c.get("classification") == "optimal"), None)
        if opt:
            optimal_picks.append(opt["microbe"])
        else:
            neutrals = [c for c in cs.get("candidates", []) if c.get("classification") == "neutral"]
            if neutrals:
                best = max(neutrals, key=lambda x: x.get("neutral_score") if x.get("neutral_score") is not None else -1)
                optimal_picks.append(best["microbe"])
            elif cs.get("candidates"):
                # Preserve deterministic behavior if malformed data slips through.
                optimal_picks.append(cs["candidates"][0]["microbe"])

    if len(preloaded) + len(optimal_picks) >= 3:
        opt_path_max = score_pool(preloaded + optimal_picks, scenario)[0]
        if opt_path_max != p2.get("optimal_max_score"):
            failures.append(
                f"[Check 11] optimal path max mismatch expected={p2.get('optimal_max_score')}, actual={opt_path_max}"
            )

    # CHECK 12 — MICROBE ATTRIBUTE VALIDITY
    for m in all_microbes:
        mid = m.get("id", "<no-id>")
        for attr in ATTRIBUTES:
            v = m.get(attr)
            if not isinstance(v, int) or not (1 <= v <= 10):
                failures.append(f"[Check 12] {mid} invalid {attr}={v!r} (expected int 1-10)")

    return failures


def main():
    script_dir = Path(__file__).parent

    with open(script_dir / "phase2_pools.json", encoding="utf-8") as f:
        phase2_data = json.load(f)
    with open(script_dir / "pools.json", encoding="utf-8") as f:
        pools_data = json.load(f)
    with open(script_dir / "scenarios.json", encoding="utf-8") as f:
        scenarios_data = json.load(f)

    pool_by_id = {}
    for _scenario_name, tiers in pools_data.items():
        for tier_name in ("easy", "medium", "hard", "hadal"):
            for p in tiers.get(tier_name, []):
                pool_by_id[p.get("pool_id")] = p

    scenario_by_name = {s["name"]: s for s in scenarios_data["scenarios"]}

    total_checked = 0
    total_passed = 0
    all_failures = []
    band_order = ["beginner", "intermediate", "advanced", "expert", "hadal", "(no band)"]
    band_counts = {b: 0 for b in band_order}

    for scenario_name in phase2_data:
        print(f"\n=== {scenario_name} ===")
        for p2 in phase2_data[scenario_name]:
            total_checked += 1
            phase2_id = p2.get("phase2_id", "<no phase2_id>")

            source_pool = pool_by_id.get(p2.get("source_pool_id"))
            scenario = scenario_by_name.get(p2.get("scenario_name"))

            if source_pool is None or scenario is None:
                failures = []
                if source_pool is None:
                    failures.append(f"source_pool_id not found: {p2.get('source_pool_id')}")
                if scenario is None:
                    failures.append(f"scenario not found: {p2.get('scenario_name')}")
                all_failures.append((phase2_id, failures))
                print(f"  [FAIL] {phase2_id}")
                for msg in failures:
                    print(f"           {msg}")
                continue

            band = source_pool.get("difficulty_band")
            if band not in band_counts:
                band = "(no band)"
            band_counts[band] += 1

            failures = validate_scenario(p2, source_pool, scenario)

            if failures:
                all_failures.append((phase2_id, failures))
                print(f"  [FAIL] {phase2_id}")
                for msg in failures:
                    print(f"           {msg}")
            else:
                total_passed += 1
                print(f"  [PASS] {phase2_id}")

    total_failed = total_checked - total_passed
    width = 54

    print()
    print("=" * width)
    print("SUMMARY")
    print("=" * width)
    print(f"  Total checked : {total_checked}")
    print(f"  Total passed  : {total_passed}")
    print(f"  Total failed  : {total_failed}")

    if all_failures:
        print()
        print("FAILURES")
        print("-" * width)
        for phase2_id, failures in all_failures:
            print(f"  {phase2_id}")
            for msg in failures:
                print(f"    - {msg}")
    else:
        print()
        print("  All phase2 scenarios passed validation.")

    print()
    print("DIFFICULTY DISTRIBUTION")
    print("-" * width)
    for band in band_order:
        count = band_counts[band]
        pct = (count / total_checked * 100) if total_checked else 0.0
        print(f"  {band:<14}: {count:>4} ({pct:>5.1f}%)")
    print("-" * width)


if __name__ == "__main__":
    main()

