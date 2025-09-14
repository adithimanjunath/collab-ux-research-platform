# tests/test_model_contract.py
from models.registry import get_active_model

def _assert_schema(out):
    for key in ["top_insight", "pie_data", "insights", "positive_highlights", "delight_distribution"]:
        assert key in out
    assert isinstance(out["insights"], list)
    for ins in out["insights"]:
        assert "category" in ins
        assert "examples" in ins and isinstance(ins["examples"], list)

def test_analyze_shape_nonempty_and_empty():
    model = get_active_model()
    # non-empty
    out1 = model.analyze_feedback_items(["Fast", "Slow checkout", "Love the UI"])
    _assert_schema(out1)
    # empty input gracefully returns the same shape
    out2 = model.analyze_feedback_items([])
    _assert_schema(out2)