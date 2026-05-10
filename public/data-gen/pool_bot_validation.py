#!/usr/bin/env python3
"""
pool_bot_validation.py

Runs heuristic bots against every pool in pools.json and produces
a report showing how well each tier actually defeats human strategies.

A well-calibrated tier set should show:
  easy:   bot avg score 80-100
  medium: bot avg score 55-80
  hard:   bot avg score 35-60
  expert: bot avg score 25-50
  hadal:  bot avg score 10-40
"""

import json
import itertools
from pathlib import Path
from statistics import mean, stdev
from typing import Optional

import numpy as np

TRAITS     = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES = ["Mobility", "Agility", "Size"]
COMBO_IDX  = np.array(list(itertools.combinations(range(10), 3)), dtype=np.int32)


# ── Scoring ────────────────────────────────────────────────────────────────────

def score_combo(trio: list, scenario: dict) -> int:
    score = 100
    for attr in ATTRIBUTES:
        lo  = scenario["attributes"][attr]["min"]
        hi  = scenario["attributes"][attr]["max"]
        avg = sum(m[attr] for m in trio) / 3.0
        if not (lo <= avg <= hi):
            score -= 20
    traits = {m["trait"] for m in trio}
    if scenario["desired_trait"]   not in traits: score -= 20
    if scenario["undesired_trait"] in     traits: score -= 20
    return score


def has_inviable(m: dict, scenario: dict) -> bool:
    for attr in ATTRIBUTES:
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        v  = m[attr]
        if v + 10 + 10 < 3 * lo or v + 1 + 1 > 3 * hi:
            return True
    return False


def attr_quality(m: dict, scenario: dict) -> float:
    score = 0.0
    for attr in ATTRIBUTES:
        lo = scenario["attributes"][attr]["min"]
        hi = scenario["attributes"][attr]["max"]
        v  = m[attr]
        if lo <= v <= hi:          score += 2
        elif v == lo-1 or v == hi+1: score += 1
    return score


# ── Bots ───────────────────────────────────────────────────────────────────────

def bot_greedy_anchor(microbes: list, scenario: dict) -> int:
    desired = [m for m in microbes
               if m["trait"] == scenario["desired_trait"]
               and not has_inviable(m, scenario)]
    others  = [m for m in microbes
               if m["trait"] != scenario["undesired_trait"]
               and not has_inviable(m, scenario)]
    if not desired:
        top3 = sorted(others, key=lambda m: attr_quality(m, scenario),
                      reverse=True)[:3]
    else:
        anchor  = max(desired, key=lambda m: attr_quality(m, scenario))
        fillers = sorted(
            [m for m in others if m["id"] != anchor["id"]],
            key=lambda m: attr_quality(m, scenario),
            reverse=True
        )[:2]
        top3 = [anchor] + fillers
    return score_combo(top3, scenario) if len(top3) == 3 else 0


def bot_attribute_maximizer(microbes: list, scenario: dict) -> int:
    candidates = [m for m in microbes
                  if m["trait"] != scenario["undesired_trait"]]
    if len(candidates) < 3:
        candidates = microbes
    top3 = sorted(candidates,
                  key=lambda m: attr_quality(m, scenario),
                  reverse=True)[:3]
    return score_combo(top3, scenario)


def bot_trait_first(microbes: list, scenario: dict) -> int:
    desired = [m for m in microbes
               if m["trait"] == scenario["desired_trait"]]
    if len(desired) >= 3:
        top3 = sorted(desired,
                      key=lambda m: attr_quality(m, scenario),
                      reverse=True)[:3]
        return score_combo(top3, scenario)
    return bot_attribute_maximizer(microbes, scenario)


def bot_balanced(microbes: list, scenario: dict) -> int:
    d_idx = [i for i, m in enumerate(microbes)
             if m["trait"] == scenario["desired_trait"]]
    u_idx = {i for i, m in enumerate(microbes)
             if m["trait"] == scenario["undesired_trait"]}
    best  = 0
    for combo in COMBO_IDX:
        if any(i in u_idx for i in combo): continue
        if not any(i in d_idx for i in combo): continue
        s = score_combo([microbes[i] for i in combo], scenario)
        if s > best:
            best = s
    return best


def best_bot(microbes: list, scenario: dict) -> int:
    return max(
        bot_greedy_anchor(microbes, scenario),
        bot_attribute_maximizer(microbes, scenario),
        bot_trait_first(microbes, scenario),
        bot_balanced(microbes, scenario),
    )


def optimal_score(microbes: list, scenario: dict) -> int:
    best = 0
    for combo in COMBO_IDX:
        s = score_combo([microbes[i] for i in combo], scenario)
        if s > best:
            best = s
    return best


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    script_dir = Path(__file__).parent

    with open(script_dir / "scenarios.json") as fh:
        scenarios_raw = json.load(fh)
    scenario_by_name = {s["name"]: s for s in scenarios_raw["scenarios"]}

    with open(script_dir / "pools.json") as fh:
        pools_data = json.load(fh)

    # Expected bot score ranges per tier
    EXPECTED = {
        "easy":   (80, 100),
        "medium": (55, 80),
        "hard":   (35, 60),
        "expert": (25, 50),
        "hadal":  (10, 40),
    }

    # Global accumulators
    tier_bot_scores: dict[str, list[int]]  = {t: [] for t in EXPECTED}
    tier_gap_scores: dict[str, list[int]]  = {t: [] for t in EXPECTED}
    tier_H_scores:   dict[str, list[float]] = {t: [] for t in EXPECTED}
    failures: list[str] = []

    W = 60
    print("=" * W)
    print("POOL BOT VALIDATION")
    print("=" * W)

    for scenario_name, tiers in pools_data.items():
        if scenario_name not in scenario_by_name:
            print(f"\n[SKIP] {scenario_name} — not in scenarios.json")
            continue
        scenario = scenario_by_name[scenario_name]
        print(f"\n── {scenario_name} ──")

        for tier_name, pools in tiers.items():
            if not isinstance(pools, list) or not pools:
                continue

            bot_scores_tier = []
            for pool_obj in pools:
                microbes  = pool_obj["microbes"]
                opt       = optimal_score(microbes, scenario)
                bot       = best_bot(microbes, scenario)
                gap       = opt - bot
                H         = pool_obj.get("difficulty_score", 0)
                pool_id   = pool_obj.get("pool_id", "?")

                bot_scores_tier.append(bot)

                if tier_name in tier_bot_scores:
                    tier_bot_scores[tier_name].append(bot)
                    tier_gap_scores[tier_name].append(gap)
                    tier_H_scores[tier_name].append(H)

                # Flag pools where bot finds optimal (should rarely happen for hard+)
                if tier_name in ("hard", "expert", "hadal") and bot >= opt:
                    failures.append(
                        f"  {pool_id}: bot={bot} == optimal={opt} "
                        f"(tier={tier_name}, H={H})"
                    )

            avg = mean(bot_scores_tier)
            std = stdev(bot_scores_tier) if len(bot_scores_tier) > 1 else 0
            lo, hi = EXPECTED.get(tier_name, (0, 100))
            status = "OK" if lo <= avg <= hi else "WARN"
            print(
                f"  [{status}] {tier_name:8s}  "
                f"n={len(bot_scores_tier):2d}  "
                f"bot_avg={avg:5.1f}  "
                f"std={std:4.1f}  "
                f"expected=[{lo},{hi}]"
            )

    print()
    print("=" * W)
    print("GLOBAL SUMMARY BY TIER")
    print("=" * W)
    for tier in ("easy", "medium", "hard", "expert", "hadal"):
        scores = tier_bot_scores[tier]
        gaps   = tier_gap_scores[tier]
        Hs     = tier_H_scores[tier]
        if not scores:
            print(f"  {tier:8s}: no pools")
            continue
        lo, hi = EXPECTED[tier]
        avg_bot = mean(scores)
        avg_gap = mean(gaps)
        avg_H   = mean(Hs)
        status  = "OK" if lo <= avg_bot <= hi else "WARN"
        print(
            f"  [{status}] {tier:8s}  "
            f"n={len(scores):3d}  "
            f"bot_avg={avg_bot:5.1f}  "
            f"gap_avg={avg_gap:5.1f}  "
            f"H_avg={avg_H:5.1f}"
        )

    if failures:
        print()
        print("POOLS WHERE BOT FOUND OPTIMAL (unexpected for hard/expert/hadal):")
        for f in failures:
            print(f)
    else:
        print()
        print("No unexpected bot-finds-optimal cases.")

    print("=" * W)


if __name__ == "__main__":
    main()