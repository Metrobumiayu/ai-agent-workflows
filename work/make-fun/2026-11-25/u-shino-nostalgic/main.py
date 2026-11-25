#!/usr/bin/env python3
"""Make the AI Judge Feel Nostalgic: A Childhood Memory.

Writes a single sentence (one line, <=280 chars) recalling a childhood
memory to /output/entry.txt. Deterministic: no network, no randomness,
no input files -- the sentence is fixed in this source file.
"""

import os
from pathlib import Path

SENTENCE = (
    "My grandmother kept my baby teeth in a chipped teacup on her dresser, "
    "and every visit I shook it just to hear them rattle like tiny stones, "
    "long after I'd stopped believing in the tooth fairy."
)

# Why this line, against the judge's published criteria (most important first):
# 1. A childhood memory that stirs nostalgia (a grandmother's keepsake ritual).
# 2. Concrete place, object and sensation: dresser, chipped teacup, the rattle.
# 3. One small honest detail (baby teeth kept in a teacup) instead of sentiment.
# 4. A single clean sentence, every word earning its place.
# 5. A warm ache that lingers: the ritual is past tense, the keeper implied gone.


def is_single_sentence(text: str) -> bool:
    """True when text is exactly one sentence: one terminal mark, at the end."""
    stripped = text.strip()
    if not stripped or stripped[-1] not in ".!?":
        return False
    # No sentence break inside: no ". " / "! " / "? " followed by a capital.
    for i, ch in enumerate(stripped[:-2]):
        if ch in ".!?" and stripped[i + 1] == " " and stripped[i + 2].isupper():
            return False
    return True


def main() -> None:
    text = SENTENCE.strip()
    assert 1 <= len(text) <= 280, f"sentence is {len(text)} chars, must be 1-280"
    assert text == text.strip() and "\n" not in text
    assert is_single_sentence(text), "entry must be a single sentence"
    out_dir = Path(os.environ.get("ENTRY_OUTPUT_DIR", "/output"))
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "entry.txt").write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
