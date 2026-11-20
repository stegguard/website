"""WSGI endpoint for the same-origin StegGuard website demo."""
import json
import os

from stegguard import ScanLimits, analyze_text

MAX_BYTES = 32768
LIMITS = ScanLimits(max_file_bytes=MAX_BYTES, max_findings=100)


def application(env, start_response):
    def reply(status, **payload):
        body = json.dumps(payload).encode("ascii")
        start_response(status, [
            ("Content-Type", "application/json"), ("Cache-Control", "no-store"),
            ("X-Content-Type-Options", "nosniff"), ("Content-Length", str(len(body))),
        ])
        return [body]

    if env["PATH_INFO"] != "/api/scan":
        return reply("404 Not Found", error="Unknown endpoint.")
    if env["REQUEST_METHOD"] != "POST":
        return reply("405 Method Not Allowed", error="Use POST.")
    origin = os.environ.get("SCAN_ORIGIN")
    if not origin or env.get("HTTP_ORIGIN") != origin or env.get("HTTP_X_STEGGUARD_SCAN") != "1":
        return reply("403 Forbidden", error="Submission refused.")
    if (env.get("CONTENT_TYPE", "").lower() != "text/plain;charset=utf-8"
            or env.get("HTTP_CONTENT_ENCODING") or env.get("HTTP_TRANSFER_ENCODING")):
        return reply("415 Unsupported Media Type", error="Send uncompressed UTF-8 text.")
    length = env.get("CONTENT_LENGTH", "")
    if not length or not length.isascii() or not length.isdecimal():
        return reply("411 Length Required", error="A byte length is required.")
    if len(length) > 5 or int(length) > MAX_BYTES:
        return reply("413 Content Too Large", error="Text exceeds 32 KiB.")
    raw = env["wsgi.input"].read(int(length))
    if not raw or len(raw) != int(length):
        return reply("400 Bad Request", error="Empty or incomplete submission.")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return reply("400 Bad Request", error="Invalid UTF-8.")
    report = analyze_text(text, LIMITS)
    if report.get("unsupported_reason"):
        return reply("422 Unprocessable Entity", error="Unsupported text.")
    findings = []
    for group in ("zero_width", "homoglyphs", "other_suspicious"):
        for item in report[group]:
            findings.append(f"Line {item.line}, column {item.col}: U+{ord(item.char):04X} ({group.replace('_', ' ')}).")
    for item in report["trailing_whitespace_lines"]:
        findings.append(f"Line {item.line}: {item.trailing_count} trailing whitespace characters.")
    if report["mixed_line_endings"]:
        findings.append("Mixed line endings.")
    return reply("200 OK", complete=not bool(report.get("error")), findings=findings)
