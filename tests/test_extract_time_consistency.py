import importlib.util
from pathlib import Path
from typing import Any

import pytest

_EXTRACT_PATH = Path(__file__).resolve().parents[1] / "extract.py"
_SPEC = importlib.util.spec_from_file_location("extract_module", _EXTRACT_PATH)
if _SPEC is None or _SPEC.loader is None:
    raise RuntimeError(f"extract.py を読み込めません: {_EXTRACT_PATH}")
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
validate_session_presentation_time_consistency = _MODULE.validate_session_presentation_time_consistency


def test_session_with_all_timed_presentations_passes() -> None:
    payload: dict[str, Any] = {
        "sessions": {
            "s1": {
                "presentation_ids": ["p1", "p2"],
            }
        },
        "presentations": {
            "p1": {"start_time": "9:00", "end_time": "9:30"},
            "p2": {"start_time": "9:30", "end_time": "10:00"},
        },
    }

    validate_session_presentation_time_consistency(payload)


def test_session_with_mixed_timed_and_untimed_presentations_fails() -> None:
    payload: dict[str, Any] = {
        "sessions": {
            "s1": {
                "presentation_ids": ["p1", "p2"],
            }
        },
        "presentations": {
            "p1": {"start_time": "9:00", "end_time": "9:30"},
            "p2": {"start_time": None, "end_time": None},
        },
    }

    with pytest.raises(ValueError, match="一部の発表のみ時刻を持っています"):
        validate_session_presentation_time_consistency(payload)


def test_blank_time_value_fails() -> None:
    payload: dict[str, Any] = {
        "sessions": {
            "s1": {
                "presentation_ids": ["p1"],
            }
        },
        "presentations": {
            "p1": {"start_time": "   ", "end_time": "9:30"},
        },
    }

    with pytest.raises(ValueError, match="空白のみ"):
        validate_session_presentation_time_consistency(payload)
