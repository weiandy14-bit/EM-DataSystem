from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class Config:
    notion_token: str
    cases_db: str
    requirements_db: str
    cns_checks_db: str
    data_dir: Path
    poll_seconds: int

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv(ROOT / ".env")
        token = os.getenv("NOTION_TOKEN", "").strip()
        if not token or token.startswith("secret_請"):
            raise ValueError("尚未設定 NOTION_TOKEN，請先執行「設定本機分析器.bat」。")
        return cls(
            notion_token=token,
            cases_db=os.getenv("NOTION_DB_COMPLIANCE_CASES", "2e5d63454c0a4b759b3b0e02e1ee25a9"),
            requirements_db=os.getenv("NOTION_DB_SPECIFICATION_REQUIREMENTS", "597d627334a6471bb72a388d2d131bf9"),
            cns_checks_db=os.getenv("NOTION_DB_CNS_CHECKS", "d0d45ddc735b4b7fbfda488f70094d1c"),
            data_dir=ROOT / "data",
            poll_seconds=max(15, int(os.getenv("POLL_SECONDS", "60"))),
        )
