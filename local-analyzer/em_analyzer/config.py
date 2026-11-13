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
    api_base: str
    username: str
    password: str
    data_dir: Path
    poll_seconds: int

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv(ROOT / ".env")
        username = os.getenv("EM_USERNAME", "").strip()
        password = os.getenv("EM_PASSWORD", "").strip()
        if not username or username.startswith("請填入") or not password or password.startswith("請填入"):
            raise ValueError("尚未設定系統登入帳號與密碼，請先執行「設定本機分析器.bat」。")
        return cls(
            api_base=os.getenv("API_BASE", "https://em-datasystem-api.weiandy14.workers.dev/api").rstrip("/"),
            username=username,
            password=password,
            data_dir=ROOT / "data",
            poll_seconds=max(15, int(os.getenv("POLL_SECONDS", "60"))),
        )
