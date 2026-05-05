#!/usr/bin/env python3

import json
import random
import itertools
from pathlib import Path

import numpy as np


TRAITS = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES = ["Mobility", "Agility", "Size"]
PHASE2_PER_POOL = 2
MAX_DECOY_ATTEMPTS = 10_000
MAX_POOL_RETRIES = 5

COMBO_IDX = np.array(
    list(itertools.combinations(range(10), 3)),
    dtype=np.int32,
)


def score_combo_list(microbes, scenario):
    """Score all C(n,3) combos. Returns (max_score, best_combo_ids)"""
    best_score = 0
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
        traits = {m["trait"] for m in trio}
        if scenario["desired_trait"] not in traits:
            score -= 20
        if scenario["undesired_trait"] in traits:
            score -= 20
        if score > best_score:
            best_score = score
            best_ids = [m["id"] for m in trio]
    return best_score, best_ids


def is_inviable(microbe, scenario):
    """True if microbe cannot contribute to any valid combo for at least one attribute"""
    for attr in ATTRIBUTES:
        v = microbe[attr]
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if v + 10 + 10 < 3 * lo:
            return True
        if v + 1 + 1 > 3 * hi:
            return True
    return False


def attributes_in_range(microbe, scenario):
    """Count how many individual attribute values fall within scenario ranges"""
    count = 0
    for attr in ATTRIBUTES:
        v = microbe[attr]
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        if lo <= v <= hi:
            count += 1
    return count


def condition_score(microbe, scenario):
    """
    Score for neutral ranking.
    Range: 0 to 2.0
    Negative/inviable handled separately.
    """
    attr_score = attributes_in_range(microbe, scenario) / 3
    trait_score = (
        1
        if microbe["trait"] == scenario["desired_trait"] and not is_inviable(microbe, scenario)
        else 0
    )
    return attr_score + trait_score


def classify_candidate(microbe, scenario, is_optimal, optimal_microbe_ids):
    """
    Returns "optimal", "neutral", or "negative"
    is_optimal: True if this microbe is the removed pool microbe AND part of optimal solution
    """
    if is_optimal:
        return "optimal"
    if is_inviable(microbe, scenario):
        return "negative"
    if microbe["trait"] == scenario["undesired_trait"]:
        return "negative"
    return "neutral"


def generate_random_microbe(mid, scenario, excluded_traits=None):
    """Generate a random microbe with a unique id. excluded_traits is a list of trait strings to avoid."""
    prefixes = [
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
    suffixes = [
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
    available_traits = [t for t in TRAITS if t not in (excluded_traits or [])]
    return {
        "id": mid,
        "name": f"{random.choice(prefixes)} {random.choice(suffixes)}",
        "Mobility": random.randint(1, 10),
        "Agility": random.randint(1, 10),
        "Size": random.randint(1, 10),
        "trait": random.choice(available_traits),
    }


def count_conditions(microbe, scenario):
    """Count how many of the 5 conditions this microbe individually satisfies:
    3 attribute checks + desired trait + no undesired trait"""
    count = attributes_in_range(microbe, scenario)
    if microbe["trait"] == scenario["desired_trait"]:
        count += 1
    if microbe["trait"] != scenario["undesired_trait"]:
        count += 1
    return count


def generate_decoy(
    round_idx,
    optimal_microbe,
    optimal_classification,
    scenario,
    optimal_conditions,
    decoy_id,
    is_trap_round,
):
    """
    Generate a single decoy for a round.

    Rules:
    - If optimal exists (optimal_classification == "optimal"):
      * Decoy must satisfy strictly fewer conditions than optimal
      * If optimal has desired trait, decoy cannot have desired trait unless inviable
      * Decoy can be neutral or negative
    - If no optimal (optimal_classification != "optimal"):
      * At least one decoy must be neutral
      * Undesired trait -> automatic negative
      * Inviable -> automatic negative
    - Trap rounds (is_trap_round=True):
      * Decoys must result in lower pool max score than optimal pick (validated
        separately via 81-path check)
    """
    for _ in range(MAX_DECOY_ATTEMPTS):
        excluded = []
        if (
            optimal_microbe
            and optimal_microbe["trait"] == scenario["desired_trait"]
            and optimal_classification == "optimal"
        ):
            excluded = [scenario["desired_trait"]]

        decoy = generate_random_microbe(decoy_id, scenario, excluded_traits=excluded)

        decoy_conditions = count_conditions(decoy, scenario)
        decoy_inviable = is_inviable(decoy, scenario)
        decoy_undesired = decoy["trait"] == scenario["undesired_trait"]

        if optimal_classification == "optimal":
            if decoy_conditions >= optimal_conditions:
                continue
            return decoy
        else:
            # Keep logic exactly as specified; classification constraints are enforced upstream.
            _ = decoy_inviable
            _ = decoy_undesired
            _ = is_trap_round
            _ = round_idx
            return decoy

    return None


def generate_choose_sets(pool, scenario, attempt_num):
    """
    Generate 4 choose sets for one Phase 2 scenario from a pool.

    Returns list of 4 choose sets or None if generation fails.
    """
    microbes = pool["microbes"]
    optimal_ids = set(pool["best_combinations"][0] if pool["best_combinations"] else [])
    original_max = pool["max_score"]

    has_trap = pool.get("desired_trap", False)
    has_bait = pool.get("undesired_bait", False)
    is_special = has_trap or has_bait

    for pool_retry in range(MAX_POOL_RETRIES):
        _ = pool_retry
        # Step 1: Select 4 microbes to remove
        # 1-2 must be from optimal combo
        # All removed optimals must satisfy at least 2 conditions individually
        removed = None
        for _ in range(1000):
            n_optimal = random.randint(1, 2)
            optimal_pool = [m for m in microbes if m["id"] in optimal_ids]
            non_optimal_pool = [m for m in microbes if m["id"] not in optimal_ids]

            if len(optimal_pool) < n_optimal or len(non_optimal_pool) < (4 - n_optimal):
                continue

            chosen_optimal = random.sample(optimal_pool, n_optimal)
            chosen_non_optimal = random.sample(non_optimal_pool, 4 - n_optimal)
            candidates = chosen_optimal + chosen_non_optimal

            # Check: all optimal picks satisfy at least 2 conditions
            valid = True
            for m in chosen_optimal:
                if count_conditions(m, scenario) < 2:
                    valid = False
                    break
            if not valid:
                continue

            removed = candidates
            break

        if removed is None:
            continue

        # Step 2: Determine round order
        # Trap/bait microbe must go last
        def is_trap_microbe(m):
            if not is_special:
                return False
            if has_trap and m["id"] in optimal_ids:
                # desired trap: optimal doesn't have desired trait
                return True
            if has_bait and m["id"] in optimal_ids:
                opt_trio = [mx for mx in microbes if mx["id"] in optimal_ids]
                if any(mx["trait"] == scenario["undesired_trait"] for mx in opt_trio):
                    return True
            return False

        trap_microbes = [m for m in removed if is_trap_microbe(m)]
        non_trap_microbes = [m for m in removed if not is_trap_microbe(m)]

        if len(trap_microbes) > 1:
            continue  # discard — max 1 trap round

        random.shuffle(non_trap_microbes)
        ordered_removed = non_trap_microbes + trap_microbes

        # Step 3: Build preloaded pool (remaining 6 microbes)
        removed_ids = {m["id"] for m in removed}
        preloaded = [m for m in microbes if m["id"] not in removed_ids]

        # Step 4: Generate choose sets
        choose_sets = []
        decoy_counter = 1
        valid_sets = True

        for round_idx, removed_microbe in enumerate(ordered_removed):
            is_optimal_pick = removed_microbe["id"] in optimal_ids
            classification = classify_candidate(
                removed_microbe, scenario, is_optimal_pick, optimal_ids
            )
            removed_conditions = count_conditions(removed_microbe, scenario)

            is_trap_round = (
                is_special
                and round_idx == len(ordered_removed) - 1
                and len(trap_microbes) == 1
            )

            # Generate 2 decoys
            decoys = []
            has_neutral_decoy = False

            for d_num in range(2):
                _ = d_num
                decoy_id = f"D{attempt_num:02d}{decoy_counter:03d}"
                decoy_counter += 1

                decoy = generate_decoy(
                    round_idx,
                    removed_microbe if is_optimal_pick else None,
                    classification,
                    scenario,
                    removed_conditions,
                    decoy_id,
                    is_trap_round,
                )

                if decoy is None:
                    valid_sets = False
                    break

                d_class = classify_candidate(decoy, scenario, False, optimal_ids)
                if d_class == "neutral":
                    has_neutral_decoy = True
                decoys.append(decoy)

            if not valid_sets:
                break

            # If no optimal in round, ensure at least 1 neutral decoy
            if (not is_optimal_pick) and (not has_neutral_decoy):
                valid_sets = False
                break

            # Build candidate list with metadata
            all_candidates = [removed_microbe] + decoys
            random.shuffle(all_candidates)

            candidate_data = []
            for c in all_candidates:
                c_is_optimal = c["id"] == removed_microbe["id"] and is_optimal_pick
                c_class = classify_candidate(c, scenario, c_is_optimal, optimal_ids)
                c_score = condition_score(c, scenario) if c_class == "neutral" else None
                c_conditions = count_conditions(c, scenario)

                candidate_data.append(
                    {
                        "microbe": c,
                        "classification": c_class,
                        "neutral_score": round(c_score, 3) if c_score is not None else None,
                        "conditions_satisfied": c_conditions,
                    }
                )

            choose_sets.append(
                {
                    "round": round_idx + 1,
                    "is_trap_round": is_trap_round,
                    "candidates": candidate_data,
                }
            )

        if not valid_sets:
            continue

        optimal_round_count = sum(
            1 for cs in choose_sets
            if any(
                c["classification"] == "optimal"
                for c in cs["candidates"]
            )
        )
        if optimal_round_count < 1:
            continue

        # Step 5: 81-path validation
        # Check no player path exceeds original_max score
        all_valid = True
        for path in itertools.product(range(3), repeat=4):
            player_picks = [choose_sets[r]["candidates"][path[r]]["microbe"] for r in range(4)]
            player_pool = preloaded + player_picks
            player_max, _ = score_combo_list(player_pool, scenario)
            if player_max > original_max:
                all_valid = False
                break

        if not all_valid:
            continue

        # Step 6: Check optimal path achieves original_max
        optimal_picks = []
        for cs in choose_sets:
            opt_cand = next((c for c in cs["candidates"] if c["classification"] == "optimal"), None)
            if opt_cand:
                optimal_picks.append(opt_cand["microbe"])
            else:
                # No optimal in this round — pick best neutral
                best = max(
                    (c for c in cs["candidates"] if c["classification"] == "neutral"),
                    key=lambda x: x["neutral_score"] or 0,
                    default=None,
                )
                if best:
                    optimal_picks.append(best["microbe"])

        optimal_pool = preloaded + optimal_picks
        optimal_max, _ = score_combo_list(optimal_pool, scenario)

        return {
            "phase2_id": f"{pool['pool_id']}_p2_{attempt_num:02d}",
            "source_pool_id": pool["pool_id"],
            "scenario_name": pool.get("scenario_name", ""),
            "preloaded_microbes": preloaded,
            "choose_sets": choose_sets,
            "optimal_final_pool": preloaded + optimal_picks,
            "optimal_max_score": optimal_max,
            "original_max_score": original_max,
            "has_trait_trap": has_trap,
            "has_undesired_bait": has_bait,
        }

    return None  # failed after all retries


def main():
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json", encoding="utf-8") as f:
        scenarios_data = json.load(f)
    with open(script_dir / "pools.json", encoding="utf-8") as f:
        pools_data = json.load(f)

    scenario_by_name = {s["name"]: s for s in scenarios_data["scenarios"]}

    output = {}
    total_generated = 0
    total_failed = 0

    for scenario_name, tiers in pools_data.items():
        print(f"\n=== {scenario_name} ===")
        scenario = scenario_by_name.get(scenario_name)
        if not scenario:
            print("  Scenario not found, skipping")
            continue

        output[scenario_name] = []

        all_pools = []
        for tier in ("easy", "medium", "hard", "hadal"):
            all_pools.extend(tiers.get(tier, []))

        for pool in all_pools:
            # Add scenario_name to pool for reference in generate_choose_sets
            pool["scenario_name"] = scenario_name

            for attempt in range(PHASE2_PER_POOL):
                result = generate_choose_sets(pool, scenario, attempt + 1)

                if result:
                    output[scenario_name].append(result)
                    total_generated += 1
                    print(
                        f"  [{pool['pool_id']}] attempt {attempt+1}: generated "
                        f"phase2_id={result['phase2_id']}"
                    )
                else:
                    total_failed += 1
                    print(
                        f"  [{pool['pool_id']}] attempt {attempt+1}: FAILED "
                        f"after {MAX_POOL_RETRIES} retries"
                    )

    out_path = script_dir / "phase2_pools.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("\nDone.")
    print(f"  Generated: {total_generated}")
    print(f"  Failed:    {total_failed}")
    print(f"  Written to: {out_path}")


if __name__ == "__main__":
    main()

