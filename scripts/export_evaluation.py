"""Run the defense evaluation matrix on the LOCAL stack and save the measured result.

Usage (host, Python 3.11+, standard library only):
    python scripts/export_evaluation.py                # API at http://127.0.0.1:8000
    python scripts/export_evaluation.py --port 18000

Writes reports/evaluation/<date>-<suite>.json and .md. Every number comes from the API
response of this run; nothing is typed in by hand.
"""

import argparse
import json
import sys
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports" / "evaluation"

OUTCOME = {
    "AUTHENTICATED": "Thành công",
    "DENIED": "Từ chối",
    "QUERY_ERROR": "Lỗi SQL",
    "REJECTED_BY_VALIDATION": "Allow-list chặn",
    "LAB_DISABLED": "Đã tắt",
    "VALIDATION_ERROR": "422",
}
ROLE = {"legitimate": "hợp lệ", "wrong_credentials": "sai thông tin", "attack": "tấn công"}


def fetch(base_url: str, path: str, method: str = "GET") -> dict:
    request = urllib.request.Request(f"{base_url}{path}", method=method)
    with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 (local only)
        return json.load(response)


def to_markdown(result: dict, health: dict, generated_at: datetime) -> str:
    lines = [
        "# Kết quả đánh giá phòng thủ nhiều lớp",
        "",
        f"- Suite: `{result['suite_id']}`",
        f"- Thời điểm chạy (UTC): {generated_at.isoformat(timespec='seconds')}",
        f"- Phiên bản dữ liệu: `{health.get('datasetVersion')}`",
        f"- Kỳ vọng đạt: {result['expectations_met']}/{result['expectations_total']} ô đo được",
        f"- Lab không an toàn: {'bật' if result['unsafe_lab_enabled'] else 'tắt (C0, C1 bỏ qua)'}",
        "",
        "## Tổng hợp theo cấu hình",
        "",
        "| Cấu hình | Lớp | Chặn tấn công | Hợp lệ vào được | Chặn nhầm "
        "| Từ chối sai thông tin | Cảnh báo tấn công / hợp lệ | TB ms |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for c in result["configurations"]:
        layers = ", ".join(c["layers"])
        if c["skipped"]:
            lines.append(f"| {c['id']} · {c['title']} | {layers} | bỏ qua | | | | | |")
            continue
        blocked = {True: "có", False: "không", None: "không đo"}[c["attack_blocked"]]
        lines.append(
            f"| {c['id']} · {c['title']} | {layers} | {blocked} "
            f"| {c['legitimate_accepted']}/{c['legitimate_total']} | {c['false_rejections']} "
            f"| {c['wrong_credentials_denied']}/{c['wrong_credentials_total']} "
            f"| {c['alerts_on_attack']} / {c['alerts_on_legitimate']} "
            f"| {c['mean_duration_ms'] if c['mean_duration_ms'] is not None else ''} |"
        )

    ids = [c["id"] for c in result["configurations"]]
    lines += ["", "## Ma trận chi tiết", "", f"| Ca | Vai trò | {' | '.join(ids)} |"]
    lines.append("|---|---|" + "|".join("---" for _ in ids) + "|")
    for case in result["cases"]:
        cells = []
        for config_id in ids:
            cell = next(
                c
                for c in result["cells"]
                if c["configuration_id"] == config_id and c["test_case_id"] == case["id"]
            )
            if cell["status"] == "skipped":
                cells.append("bỏ qua")
                continue
            text = OUTCOME.get(cell["actual_outcome"], cell["actual_outcome"])
            if cell["status"] == "failed":
                text += f" (kỳ vọng {OUTCOME.get(cell['expected_outcome'])})"
            cells.append(f"{text} `{(cell['run_id'] or '')[:8]}`")
        lines.append(
            f"| {case['id']} `{case['input_label']}` | {ROLE[case['role']]} | {' | '.join(cells)} |"
        )
    lines += [
        "",
        "Mã 8 ký tự trong ô là tiền tố run ID, tra được bằng `GET /api/v1/labs/runs/{run_id}`.",
        "",
        "Giới hạn: một kịch bản đăng nhập, một payload, dữ liệu tổng hợp. "
        "Kết quả không chứng minh ứng dụng miễn nhiễm SQL Injection.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    if args.host not in {"127.0.0.1", "localhost"}:
        print("refused: this script only talks to the local lab", file=sys.stderr)
        return 2
    base_url = f"http://{args.host}:{args.port}/api/v1"
    assert urlparse(base_url).hostname in {"127.0.0.1", "localhost"}

    health = fetch(base_url, "/health")
    result = fetch(base_url, "/labs/login-bypass/evaluation/run", method="POST")
    generated_at = datetime.now(UTC)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = f"{generated_at:%Y-%m-%d}-{result['suite_id'][:8]}"
    payload = {"generated_at": generated_at.isoformat(), "health": health, "result": result}
    (OUT_DIR / f"{stem}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT_DIR / f"{stem}.md").write_text(
        to_markdown(result, health, generated_at), encoding="utf-8"
    )
    print(f"saved reports/evaluation/{stem}.json and .md")
    print(f"expectations met: {result['expectations_met']}/{result['expectations_total']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
