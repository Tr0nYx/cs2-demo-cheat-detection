from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHASE_DIR = ROOT / ".planning" / "phases" / "21-anticheatpt-research-python-pipeline-guidance"
ROADMAP_PATH = ROOT / ".planning" / "ROADMAP.md"


def test_phase21_phase_docs_exist():
    assert PHASE_DIR.exists(), f"Phase directory missing: {PHASE_DIR}"
    assert (PHASE_DIR / "README.md").is_file(), "Phase 21 README.md is missing"
    assert (PHASE_DIR / "21-01-PLAN.md").is_file(), "Phase 21 plan file is missing"
    assert (PHASE_DIR / "21-VALIDATION.md").is_file(), "Phase 21 validation file is missing"


def test_phase21_roadmap_entry_present():
    content = ROADMAP_PATH.read_text(encoding="utf-8")
    assert "Phase 21: AntiCheatPT Research and Python Pipeline Guidance" in content, "Roadmap entry for Phase 21 is missing"


def test_phase21_validation_document_mentions_execution_status():
    validation_text = (PHASE_DIR / "21-VALIDATION.md").read_text(encoding="utf-8")
    assert "research wave executed" in validation_text
    assert "targeted Python tests" in validation_text


def test_phase21_summary_exists():
    assert (PHASE_DIR / "21-01-SUMMARY.md").is_file(), "Phase 21 summary file is missing"
