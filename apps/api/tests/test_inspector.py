from queryshield_api.modules.laboratory import inspector
from queryshield_api.modules.laboratory.adapters import vulnerable
from queryshield_api.modules.laboratory.adapters.secure import SECURE_LOGIN_SQL

SECRET = "S3cret-Value!"


def test_query_parts_match_the_executed_builder() -> None:
    for username in ("student01", "admin' -- ", "O'Connor", "nguyễn.văn.an"):
        parts = vulnerable.query_parts(username, SECRET)
        assert "".join(text for text, _ in parts) == vulnerable.build_query(username, SECRET)


def test_vulnerable_query_is_single_line() -> None:
    assert "\n" not in vulnerable.build_query("admin' -- ", SECRET)


def test_classify_sql_handles_literals_escapes_and_comments() -> None:
    text = "a = 'x''y' -- tail"
    classes = inspector.classify_sql(text)
    assert classes[text.index("x")] == "string"
    assert classes[text.index("y")] == "string"  # doubled quote stays inside the literal
    assert classes[text.index("t")] == "comment"
    assert classes[0] == "code"


def test_payload_is_shown_escaping_literal_and_commenting_password_check() -> None:
    result = inspector.vulnerable_inspector(
        "admin' -- ", vulnerable.VULNERABLE_LOGIN_TEMPLATE, vulnerable.query_parts
    )
    assert result.explanation_code == "UNSAFE_CONCATENATION"
    assert {
        "INPUT_ESCAPED_STRING_LITERAL",
        "INPUT_STARTED_COMMENT",
        "PASSWORD_CHECK_COMMENTED_OUT",
    } <= set(result.observations)
    commented = "".join(s.text for s in result.segments if s.syntax == "comment")
    assert "crypt(" in commented


def test_benign_input_stays_inside_literal() -> None:
    result = inspector.vulnerable_inspector(
        "student01", vulnerable.VULNERABLE_LOGIN_TEMPLATE, vulnerable.query_parts
    )
    assert result.observations == ["INPUT_STAYED_INSIDE_LITERAL"]


def test_inspectors_never_contain_the_password() -> None:
    vuln = inspector.vulnerable_inspector(
        "admin' -- ", vulnerable.VULNERABLE_LOGIN_TEMPLATE, vulnerable.query_parts
    )
    secure = inspector.secure_inspector("admin' -- ", SECURE_LOGIN_SQL)
    for result in (vuln, secure):
        assert SECRET not in repr(result)
        assert inspector.PASSWORD_MASK in result.sql_preview_redacted or result is secure
        assert "không phải nhật ký" in result.preview_label


def test_secure_inspector_separates_values_from_sql() -> None:
    result = inspector.secure_inspector("admin' -- ", SECURE_LOGIN_SQL)
    assert result.explanation_code == "PARAMETER_BINDING"
    assert "admin' -- " not in result.sql_preview_redacted
    assert [s.text for s in result.segments if s.origin == "placeholder"] == ["%s", "%s"]
    password = next(p for p in result.parameters if p.name == "password")
    assert password.redacted is True and password.value is None
