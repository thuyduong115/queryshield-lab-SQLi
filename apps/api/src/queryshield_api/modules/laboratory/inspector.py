"""Query inspector: a REDACTED educational view of the query shape.

The preview is derived from the same builder the adapter used, with the password replaced
by a mask. It is labelled as a derived preview, never as a PostgreSQL trace. The submitted
password never appears in any inspector field.
"""

from dataclasses import dataclass, field
from typing import Literal

PASSWORD_MASK = "[mật khẩu đã ẩn]"
PREVIEW_LABEL = "Bản xem trước đã che (dựng lại để giảng dạy, không phải nhật ký của PostgreSQL)"

Origin = Literal["template", "username", "password", "placeholder"]
Syntax = Literal["code", "string", "comment"]


@dataclass
class Segment:
    text: str
    origin: Origin
    syntax: Syntax


@dataclass
class Parameter:
    position: int
    name: str
    sql_type: str
    value: str | None
    redacted: bool


@dataclass
class Inspector:
    query_template: str
    sql_preview_redacted: str
    preview_label: str
    segments: list[Segment]
    parameters: list[Parameter]
    explanation_code: Literal["UNSAFE_CONCATENATION", "PARAMETER_BINDING"]
    observations: list[str] = field(default_factory=list)


def classify_sql(text: str) -> list[Syntax]:
    """Per-character lexical class using PostgreSQL rules for '...' literals and -- comments.

    standard_conforming_strings is on (PostgreSQL default), so backslash is not an escape;
    a doubled quote '' inside a literal is an escaped quote.
    """
    classes: list[Syntax] = []
    state: Syntax = "code"
    i = 0
    while i < len(text):
        ch = text[i]
        if state == "comment":
            if ch == "\n":
                state = "code"
                classes.append("code")
            else:
                classes.append("comment")
        elif state == "string":
            classes.append("string")
            if ch == "'":
                if i + 1 < len(text) and text[i + 1] == "'":
                    classes.append("string")
                    i += 1
                else:
                    state = "code"
        else:
            if ch == "'":
                state = "string"
                classes.append("string")
            elif ch == "-" and i + 1 < len(text) and text[i + 1] == "-":
                state = "comment"
                classes.append("comment")
            else:
                classes.append("code")
        i += 1
    return classes


def _segments(parts: tuple[tuple[str, str], ...]) -> list[Segment]:
    text = "".join(p for p, _ in parts)
    classes = classify_sql(text)
    segments: list[Segment] = []
    offset = 0
    for part_text, origin in parts:
        for j, ch in enumerate(part_text):
            syntax = classes[offset + j]
            if segments and segments[-1].origin == origin and segments[-1].syntax == syntax:
                segments[-1].text += ch
            else:
                segments.append(Segment(ch, origin, syntax))  # type: ignore[arg-type]
        offset += len(part_text)
    return segments


def vulnerable_inspector(username: str, template: str, parts_builder) -> Inspector:
    parts = parts_builder(username, PASSWORD_MASK)
    segments = _segments(parts)
    preview = "".join(s.text for s in segments)

    observations: list[str] = []
    username_syntax = {s.syntax for s in segments if s.origin == "username"}
    if username_syntax - {"string"}:
        observations.append("INPUT_ESCAPED_STRING_LITERAL")
    if "comment" in username_syntax:
        observations.append("INPUT_STARTED_COMMENT")
    if any(
        s.origin == "template" and s.syntax == "comment" and "password =" in s.text
        for s in segments
    ):
        observations.append("PASSWORD_CHECK_COMMENTED_OUT")
    if not observations:
        observations.append("INPUT_STAYED_INSIDE_LITERAL")

    return Inspector(
        query_template=template,
        sql_preview_redacted=preview,
        preview_label=PREVIEW_LABEL,
        segments=segments,
        parameters=[],
        explanation_code="UNSAFE_CONCATENATION",
        observations=observations,
    )


def secure_inspector(username: str, template: str) -> Inspector:
    pieces = template.split("%s")
    parts: list[tuple[str, str]] = []
    for index, piece in enumerate(pieces):
        parts.append((piece, "template"))
        if index < len(pieces) - 1:
            parts.append(("%s", "placeholder"))
    segments = [
        Segment(text, origin, "code")  # type: ignore[arg-type]
        for text, origin in parts
        if text
    ]
    return Inspector(
        query_template=template,
        sql_preview_redacted=template,
        preview_label=PREVIEW_LABEL,
        segments=segments,
        parameters=[
            Parameter(1, "username", "text", username, False),
            Parameter(2, "password", "text", None, True),
        ],
        explanation_code="PARAMETER_BINDING",
        observations=["VALUES_SENT_SEPARATELY"],
    )
