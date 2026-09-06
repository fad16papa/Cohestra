#!/usr/bin/env python3
"""Strip secret-bearing values from crash diagnostics. Never echo credentials."""

import re
import sys

SECRET_KEY = re.compile(
    r"(?i)("
    r"password|passwd|pwd|secret|apikey|api_key|signing[_-]?key|"
    r"jwt[_-]?signing|authorization|bearer|token|connectionstring|"
    r"connectionstrings__|paddle__apikey|sendgrid__apikey|"
    r"webhooksecret|clienttoken"
    r")([\"']?\s*[:=]\s*)(\S+)"
)
CONN = re.compile(r"(?i)(Host=)[^;\s]+")
USER = re.compile(r"(?i)(Username=)[^;\s]+")
PASS = re.compile(r"(?i)(Password=)[^;\s]+")
SG = re.compile(r"SG\.[A-Za-z0-9_\-.]{8,}")
PDL = re.compile(r"pdl_[A-Za-z0-9_]+")
PRI = re.compile(r"pri_[A-Za-z0-9]+")
HEX = re.compile(r"\b[A-Fa-f0-9]{48,}\b")


def redact_line(line: str) -> str:
    line = SECRET_KEY.sub(r"\1\2[REDACTED]", line)
    line = CONN.sub(r"\1[REDACTED]", line)
    line = USER.sub(r"\1[REDACTED]", line)
    line = PASS.sub(r"\1[REDACTED]", line)
    line = SG.sub("SG.[REDACTED]", line)
    line = PDL.sub("pdl_[REDACTED]", line)
    line = PRI.sub("pri_[REDACTED]", line)
    line = HEX.sub("[REDACTED]", line)
    return line


def main() -> None:
    for raw in sys.stdin:
        sys.stdout.write(redact_line(raw))


if __name__ == "__main__":
    main()
