#!/usr/bin/env python3
"""
validate_pools_v3.py

Validation script for pools_v3.json output from generate_pools_v3.py.

Checks:
  1. Invariant violations       — should be 0
  2. Cell coverage              — which (max_score × band) cells are under target
  3. Bot stratification         — mean bot score per band (should decrease band by band)
  4. Factor independence        — Pearson correlation matrix (flag |r| > 0.7 pairs)
  5. H score distribution       — histogram per band (check for heavy overlap)
  6. Sanity samples             — 2 random pools per band for human spot-check

Run from public/data-gen/:
  python validate_pools_v3.py
"""

import json
import random
import itertools
from pathlib import Path
from collections import defaultdict
from statistics import mean, stdev

import numpy as np

# ── Constants (must match generate_pools_v3.py) ────────────────────────────────
TRAITS     = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"]
ATTRIBUTES = ["Mobility", "Agility", "Size"]
BANDS      = ["beginner", "intermediate", "advanced", "hadal"]

MAX_SCORE_VALUES    = [100, 80, 60]
MAX_SCORE_FRACTIONS = {100: 0.50, 80: 0.30, 60: 0.20}

FACTOR_KEYS = [
    "heuristic_resistance",
    "decoy_density",
    "plateau_score",
    "similarity_score",
    "win_margin",
    "trait_trap_intensity",
    "anchor_ambiguity",
]
BOT_KEYS = [
    "GreedyAnchorBot",
    "AttributeMaximizerBot",
    "TraitFirstBot",
    "BalancedBot",
    "TimeBoxedBot",
    "FirstImpressionBot",
]

COMBO_IDX = np.array(list(itertools.combinations(range(10), 3)), dtype=np.int32)


# =============================================================================
# SCORING HELPERS  (independent re-implementation for validation)
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


def is_inviable(val: int, lo: int, hi: int) -> bool:
    return val + 10 + 10 < 3 * lo or val + 1 + 1 > 3 * hi


def has_inviable(m: dict, sc: dict) -> bool:
    return any(is_inviable(m[a], sc["attributes"][a]["min"],
                           sc["attributes"][a]["max"])
               for a in ATTRIBUTES)


def viable_anchor_exists(ms: list, sc: dict, cs: np.ndarray, max_score: int) -> bool:
    for i, m in enumerate(ms):
        if m["trait"] != sc["desired_trait"] or has_inviable(m, sc):
            continue
        with_m = [ci for ci, t in enumerate(COMBO_IDX) if i in t]
        if any(int(cs[ci]) >= max_score - 20 for ci in with_m):
            return True
    return False


# =============================================================================
# 1. INVARIANT CHECKING
# =============================================================================

def check_invariants(pool: dict, sc: dict) -> list:
    """Returns list of violation strings. Empty = pool passes all invariants."""
    ms       = pool["microbes"]
    stored   = pool["max_score"]
    cs       = score_all(ms, sc)
    actual   = int(cs.max())
    v        = []

    if actual != stored:
        v.append(f"  stored max_score={stored} but recomputed={actual}")
    if len(ms) != 10:
        v.append(f"  has {len(ms)} microbes, expected 10")
    if not viable_anchor_exists(ms, sc, cs, actual):
        v.append("  no viable desired-trait anchor")
    if not any(m["trait"] == sc["undesired_trait"] for m in ms):
        v.append("  no undesired-trait microbe")
    ids = [m["id"] for m in ms]
    if len(ids) != len(set(ids)):
        v.append(f"  duplicate microbe IDs: {[x for x in ids if ids.count(x) > 1]}")
    return v


# =============================================================================
# 2. COVERAGE
# =============================================================================

def check_coverage(pools_data: dict, total_pools: int) -> tuple:
    """
    Reports deviation from target distributions.
    Targets: 25% per band, 50/30/20% per max_score.
    """
    all_pools = [p for bands in pools_data.values()
                   for ps in bands.values() for p in ps]
    n = len(all_pools)

    band_counts = defaultdict(int)
    max_counts  = defaultdict(int)
    for p in all_pools:
        band_counts[p["difficulty_band"]] += 1
        max_counts[p["max_score"]]        += 1

    warnings = []
    target_band = n / len(BANDS)
    for band in BANDS:
        got = band_counts.get(band, 0)
        pct = got / n * 100 if n else 0
        tgt = 25.0
        if abs(pct - tgt) > 8:
            warnings.append(f"  Band '{band}': {got} ({pct:.1f}%) vs target {tgt:.0f}%")

    for ms, frac in MAX_SCORE_FRACTIONS.items():
        got = max_counts.get(ms, 0)
        pct = got / n * 100 if n else 0
        tgt = frac * 100
        if abs(pct - tgt) > 8:
            warnings.append(f"  max_score={ms}: {got} ({pct:.1f}%) vs target {tgt:.0f}%")

    return band_counts, max_counts, warnings


# =============================================================================
# 3. BOT STRATIFICATION
# =============================================================================

def check_bot_stratification(all_pools: list) -> dict:
    """Mean bot score per band. Expected: decreasing from beginner to hadal."""
    by_band = defaultdict(list)
    for p in all_pools:
        by_band[p["difficulty_band"]].append(p)

    result = {}
    for band in BANDS:
        ps = by_band.get(band, [])
        if not ps:
            result[band] = {"n": 0}
            continue
        bm = {}
        for bot in BOT_KEYS:
            scores = [p["bot_scores"].get(bot, 0) for p in ps if "bot_scores" in p]
            bm[bot] = round(mean(scores), 1) if scores else None
        result[band] = {"n": len(ps), **bm}
    return result


# =============================================================================
# 4. FACTOR INDEPENDENCE
# =============================================================================

def check_factor_independence(all_pools: list) -> tuple:
    """Pearson r between every factor pair. Flag |r| > 0.7."""
    data = {k: [] for k in FACTOR_KEYS}
    for p in all_pools:
        fb = p.get("factor_breakdown", {})
        for k in FACTOR_KEYS:
            data[k].append(fb.get(k, 0.0))

    matrix   = {}
    warnings = []
    for i, ki in enumerate(FACTOR_KEYS):
        matrix[ki] = {}
        for j, kj in enumerate(FACTOR_KEYS):
            if i == j:
                matrix[ki][kj] = 1.0
                continue
            xi = np.array(data[ki])
            xj = np.array(data[kj])
            r  = float(np.corrcoef(xi, xj)[0, 1]) if xi.std() > 0 and xj.std() > 0 else 0.0
            matrix[ki][kj] = round(r, 3)
            if i < j and abs(r) > 0.7:
                warnings.append(
                    f"  HIGH CORRELATION ({r:+.3f}): {ki} <-> {kj}"
                    f" — consider dropping or merging one"
                )
    return matrix, warnings


# =============================================================================
# 5. H DISTRIBUTION
# =============================================================================

def check_h_distribution(all_pools: list) -> dict:
    """Per-band min/max/mean/stdev of H plus ASCII histogram."""
    by_band = defaultdict(list)
    for p in all_pools:
        by_band[p["difficulty_band"]].append(p["difficulty_score"])

    result = {}
    for band in BANDS:
        hs = by_band.get(band, [])
        if not hs:
            result[band] = {"n": 0}
            continue
        buckets = defaultdict(int)
        for h in hs:
            buckets[int(h // 5) * 5] += 1
        result[band] = {
            "n":         len(hs),
            "min":       round(min(hs), 1),
            "max":       round(max(hs), 1),
            "mean":      round(mean(hs), 1),
            "stdev":     round(stdev(hs), 1) if len(hs) > 1 else 0.0,
            "histogram": {f"{b}-{b+4}": c for b, c in sorted(buckets.items())},
        }
    return result


# =============================================================================
# 6. SANITY SAMPLES
# =============================================================================

def get_samples(all_pools: list) -> dict:
    """2 random pools per band for human spot-check."""
    by_band = defaultdict(list)
    for p in all_pools:
        by_band[p["difficulty_band"]].append(p)

    samples = {}
    for band in BANDS:
        chosen = random.sample(by_band.get(band, []),
                               min(2, len(by_band.get(band, []))))
        samples[band] = [
            {
                "pool_id":          p["pool_id"],
                "max_score":        p["max_score"],
                "difficulty_score": p["difficulty_score"],
                "factor_breakdown": p.get("factor_breakdown", {}),
                "bot_scores":       p.get("bot_scores", {}),
                "best_combinations": p["best_combinations"],
                "microbes":         p["microbes"],
            }
            for p in chosen
        ]
    return samples


# =============================================================================
# DISPLAY HELPERS
# =============================================================================

SEP = "─" * 72


def div(title: str = "") -> None:
    if title:
        pad = (72 - len(title) - 2) // 2
        print(f"\n{'─'*pad} {title} {'─'*pad}")
    else:
        print(f"\n{SEP}")


def print_bot_table(strat: dict) -> None:
    labels = [b[:7] for b in BOT_KEYS]
    header = f"{'Band':<16} {'N':>4}  " + "  ".join(f"{l:>7}" for l in labels)
    print(header)
    print(SEP)
    prev = None
    for band in BANDS:
        row  = strat.get(band, {})
        n    = row.get("n", 0)
        vals = [row.get(b) for b in BOT_KEYS]
        line = "  ".join(f"{(v or 0):>7.1f}" for v in vals)
        print(f"{band:<16} {n:>4}  {line}")
        if prev:
            for k, (p, c) in enumerate(zip(prev, vals)):
                if p is not None and c is not None and c > p + 5:
                    print(f"  ⚠  {BOT_KEYS[k]}: score went UP from {p:.1f} to {c:.1f}")
        prev = vals


def print_corr_matrix(matrix: dict) -> None:
    labels = ["hr", "dd", "ps", "ss", "wm", "tt", "aa"]
    print(f"{'':>6}" + " ".join(f"{l:>7}" for l in labels))
    for ki, li in zip(FACTOR_KEYS, labels):
        row = " ".join(f"{matrix[ki][kj]:>7.3f}" for kj in FACTOR_KEYS)
        print(f"{li:>6} {row}")


def print_h_dist(h_dist: dict) -> None:
    for band in BANDS:
        s = h_dist.get(band, {})
        if s.get("n", 0) == 0:
            print(f"  {band:<15} — no pools")
            continue
        print(f"  {band:<15} n={s['n']:>3}  H {s['min']:>5.1f}–{s['max']:>5.1f}"
              f"  mean={s['mean']:>5.1f}  sd={s['stdev']:>4.1f}")
        mx = max(s["histogram"].values())
        for label, cnt in sorted(s["histogram"].items(),
                                 key=lambda x: int(x[0].split("-")[0])):
            bar = "█" * int(cnt / mx * 28)
            print(f"    {label:>7}: {bar} {cnt}")


def print_sample(p: dict) -> None:
    opt = set(p["best_combinations"][0]) if p["best_combinations"] else set()
    print(f"\n  Pool: {p['pool_id']}  max_score={p['max_score']}  H={p['difficulty_score']}")
    fb = p.get("factor_breakdown", {})
    labels = {"heuristic_resistance": "hr", "decoy_density": "dd",
              "plateau_score": "ps", "similarity_score": "ss",
              "win_margin": "wm", "trait_trap_intensity": "tt",
              "anchor_ambiguity": "aa"}
    print("  Factors: " + "  ".join(f"{labels[k]}={v:.1f}" for k, v in fb.items()))
    bs = p.get("bot_scores", {})
    print("  Bots:    " + "  ".join(f"{k[:5]}={v}" for k, v in bs.items()))
    print(f"  Optimal: {p['best_combinations']}")
    print("  Microbes:")
    for m in p["microbes"]:
        star = "★" if m["id"] in opt else " "
        print(f"    {star} {m['id']}  {m['name']:<25} "
              f"Mob={m['Mobility']} Agi={m['Agility']} Siz={m['Size']}  {m['trait']}")


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    script_dir = Path(__file__).parent

    pools_path = script_dir / "pools_v3.json"
    if not pools_path.exists():
        print(f"ERROR: {pools_path} not found. Run generate_pools_v3.py first.")
        return

    with open(pools_path) as fh:
        pools_data: dict = json.load(fh)

    with open(script_dir / "scenarios.json") as fh:
        scenarios = {s["name"]: s for s in json.load(fh)["scenarios"]}

    # Flatten all pools; attach scenario
    all_pools: list = []
    for sc_name, bands in pools_data.items():
        sc = scenarios.get(sc_name)
        if not sc:
            print(f"WARNING: '{sc_name}' not found in scenarios.json")
            continue
        for band, pool_list in bands.items():
            for p in pool_list:
                p["_scenario"] = sc
                all_pools.append(p)

    n_total = len(all_pools)
    print(f"Loaded {n_total} pools across {len(pools_data)} scenarios.")

    # ── 1. Invariants ──────────────────────────────────────────────────────────
    div("1. INVARIANT VIOLATIONS")
    total_violations = 0
    for p in all_pools:
        viols = check_invariants(p, p["_scenario"])
        if viols:
            total_violations += len(viols)
            print(f"\n  {p['pool_id']} (band={p['difficulty_band']}, max={p['max_score']}):")
            for v in viols:
                print(f"    {v}")
    if total_violations == 0:
        print("  ✓ All pools pass all invariants.")
    else:
        print(f"\n  ✗ {total_violations} violation(s) across {n_total} pools.")

    # Duplicate pool_id check
    pool_ids = [p["pool_id"] for p in all_pools]
    dupes    = {pid for pid in pool_ids if pool_ids.count(pid) > 1}
    if dupes:
        print(f"\n  ✗ Duplicate pool_ids: {dupes}")
    else:
        print("  ✓ All pool_ids unique.")

    # ── 2. Coverage ────────────────────────────────────────────────────────────
    div("2. DISTRIBUTION COVERAGE")
    band_counts, max_counts, cov_warnings = check_coverage(pools_data, n_total)

    print(f"\n  Total pools: {n_total}")
    print("\n  Difficulty band distribution (target: 25% each):")
    for band in BANDS:
        cnt = band_counts.get(band, 0)
        pct = cnt / n_total * 100 if n_total else 0
        bar = "█" * int(pct / 2)
        print(f"    {band:<15}: {cnt:>3}  ({pct:5.1f}%)  {bar}")

    print("\n  Max score distribution (target: 50% / 30% / 20%):")
    for ms in MAX_SCORE_VALUES:
        cnt = max_counts.get(ms, 0)
        pct = cnt / n_total * 100 if n_total else 0
        tgt = MAX_SCORE_FRACTIONS[ms] * 100
        flag = " ⚠" if abs(pct - tgt) > 8 else " ✓"
        print(f"    max={ms}: {cnt:>3}  ({pct:5.1f}%)  target={tgt:.0f}%{flag}")

    print(f"\n  Pools per scenario:")
    for sc_name, bands in pools_data.items():
        cnt = sum(len(v) for v in bands.values())
        print(f"    {sc_name:<30}: {cnt}")

    if cov_warnings:
        print(f"\n  Coverage warnings:")
        for w in cov_warnings:
            print(w)
    else:
        print("\n  ✓ All distributions within 8% of target.")

    # ── 3. Bot stratification ──────────────────────────────────────────────────
    div("3. BOT STRATIFICATION (mean score per band)")
    print("  Expected: all columns decrease monotonically beginner → hadal.\n")
    strat = check_bot_stratification(all_pools)
    print_bot_table(strat)

    # ── 4. Factor independence ─────────────────────────────────────────────────
    div("4. FACTOR INDEPENDENCE (Pearson r)")
    print("  Keys: hr=heuristic_resistance  dd=decoy_density  ps=plateau_score")
    print("        ss=similarity_score  wm=win_margin  tt=trait_trap  aa=anchor_ambiguity")
    print("  Flag: |r| > 0.7 = redundant pair — consider dropping or reweighting\n")
    matrix, corr_warnings = check_factor_independence(all_pools)
    print_corr_matrix(matrix)
    if corr_warnings:
        print()
        for w in corr_warnings:
            print(w)
    else:
        print("\n  ✓ No highly correlated factor pairs.")

    # ── 5. H distribution ─────────────────────────────────────────────────────
    div("5. H SCORE DISTRIBUTION (per band)")
    print("  Check for heavy overlap between adjacent bands.\n")
    h_dist = check_h_distribution(all_pools)
    print_h_dist(h_dist)

    # Overlap detection between adjacent bands
    ranges = {}
    for band in BANDS:
        s = h_dist.get(band, {})
        if s.get("n", 0) > 0:
            ranges[band] = (s["min"], s["max"])
    for i in range(len(BANDS) - 1):
        b1, b2 = BANDS[i], BANDS[i + 1]
        if b1 in ranges and b2 in ranges:
            lo1, hi1 = ranges[b1]
            lo2, hi2 = ranges[b2]
            overlap  = max(0.0, min(hi1, hi2) - max(lo1, lo2))
            if overlap > 10:
                print(f"\n  ⚠ {b1} ({lo1:.1f}-{hi1:.1f}) and {b2} ({lo2:.1f}-{hi2:.1f})"
                      f" overlap by {overlap:.1f} pts — tune BAND_H_RANGES")

    # ── 6. Sanity samples ──────────────────────────────────────────────────────
    div("6. SANITY SAMPLES (2 per band — manual review)")
    print("  beginner: answer should be obvious  |  hadal: should require real work\n")
    samples = get_samples(all_pools)
    for band in BANDS:
        print(f"\n  ══ {band.upper()} ══")
        if not samples.get(band):
            print("    (no pools in this band)")
        for s in samples[band]:
            print_sample(s)

    # ── Summary ────────────────────────────────────────────────────────────────
    div("SUMMARY")
    print(f"  Total pools:          {n_total}")
    print(f"  Invariant violations: {total_violations}")
    print(f"  Duplicate pool_ids:   {len(dupes)}")
    print(f"  Coverage warnings:    {len(cov_warnings)}")
    print(f"  Correlated factors:   {len(corr_warnings)}")

    all_ok = (total_violations == 0 and len(dupes) == 0 and len(cov_warnings) == 0)
    print()
    if all_ok:
        print("  ✓ File looks good. Review samples and bot stratification, then")
        print("    tune BAND_H_RANGES if H bands overlap heavily.")
        print("    When satisfied, rename pools_v3.json -> pools.json.")
    else:
        print("  ✗ Issues found — fix before migrating to pools.json.")


if __name__ == "__main__":
    main()
