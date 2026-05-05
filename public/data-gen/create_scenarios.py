import json
from pathlib import Path


SCENARIOS = [
  {
    "id": 1,
    "name": "Coral Reef Delta",
    "attributes": {
      "Mobility": {"min": 2, "max": 4},
      "Agility":  {"min": 5, "max": 7},
      "Size":     {"min": 3, "max": 5}
    },
    "desired_trait":   "Biofilm-forming",
    "undesired_trait": "Thermophilic"
  },
  {
    "id": 2,
    "name": "Arctic Shelf",
    "attributes": {
      "Mobility": {"min": 4, "max": 6},
      "Agility":  {"min": 4, "max": 6},
      "Size":     {"min": 6, "max": 8}
    },
    "desired_trait":   "Metal-tolerant",
    "undesired_trait": "Biofilm-forming"
  },
  {
    "id": 3,
    "name": "Volcanic Vent",
    "attributes": {
      "Mobility": {"min": 7, "max": 9},
      "Agility":  {"min": 5, "max": 7},
      "Size":     {"min": 1, "max": 3}
    },
    "desired_trait":   "Thermophilic",
    "undesired_trait": "Halophobic"
  },
  {
    "id": 4,
    "name": "Coastal Estuary",
    "attributes": {
      "Mobility": {"min": 2, "max": 4},
      "Agility":  {"min": 7, "max": 9},
      "Size":     {"min": 6, "max": 8}
    },
    "desired_trait":   "Halophobic",
    "undesired_trait": "Metal-tolerant"
  },
  {
    "id": 5,
    "name": "Deep Abyssal Plain",
    "attributes": {
      "Mobility": {"min": 4, "max": 6},
      "Agility":  {"min": 1, "max": 3},
      "Size":     {"min": 8, "max": 10}
    },
    "desired_trait":   "Metal-tolerant",
    "undesired_trait": "Thermophilic"
  },
  {
    "id": 6,
    "name": "Tropical Lagoon",
    "attributes": {
      "Mobility": {"min": 7, "max": 9},
      "Agility":  {"min": 7, "max": 9},
      "Size":     {"min": 3, "max": 5}
    },
    "desired_trait":   "Biofilm-forming",
    "undesired_trait": "Halophobic"
  },
  {
    "id": 7,
    "name": "Mangrove Estuary",
    "attributes": {
      "Mobility": {"min": 1, "max": 3},
      "Agility":  {"min": 3, "max": 5},
      "Size":     {"min": 5, "max": 7}
    },
    "desired_trait":   "Halophobic",
    "undesired_trait": "Thermophilic"
  },
  {
    "id": 8,
    "name": "Polar Ice Cap",
    "attributes": {
      "Mobility": {"min": 5, "max": 7},
      "Agility":  {"min": 2, "max": 4},
      "Size":     {"min": 7, "max": 9}
    },
    "desired_trait":   "Metal-tolerant",
    "undesired_trait": "Biofilm-forming"
  },
  {
    "id": 9,
    "name": "Hydrothermal Basin",
    "attributes": {
      "Mobility": {"min": 6, "max": 8},
      "Agility":  {"min": 5, "max": 7},
      "Size":     {"min": 2, "max": 4}
    },
    "desired_trait":   "Thermophilic",
    "undesired_trait": "Metal-tolerant"
  },
  {
    "id": 10,
    "name": "Abyssal Trench",
    "attributes": {
      "Mobility": {"min": 3, "max": 5},
      "Agility":  {"min": 8, "max": 10},
      "Size":     {"min": 7, "max": 9}
    },
    "desired_trait":   "Biofilm-forming",
    "undesired_trait": "Halophobic"
  },
  {
    "id": 11,
    "name": "Hadal Abyss",
    "attributes": {
      "Mobility": {"min": 2, "max": 4},
      "Agility":  {"min": 7, "max": 9},
      "Size":     {"min": 2, "max": 4}
    },
    "desired_trait":   "Thermophilic",
    "undesired_trait": "Halophobic"
  }
]


DATA = {
  "traits": ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"],
  "attributes": ["Mobility", "Agility", "Size"],
  "scenarios": SCENARIOS,
}


def main() -> None:
  out_path = Path(__file__).resolve().parent / "scenarios.json"
  out_path.write_text(json.dumps(DATA, indent=2), encoding="utf-8")
  print(f"scenarios.json written with {len(SCENARIOS)} scenarios")


if __name__ == "__main__":
  main()

