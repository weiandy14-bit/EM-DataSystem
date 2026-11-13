from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .config import Config
from .rules import Requirement


@dataclass(frozen=True)
class CaseFile:
    name: str
    url: str


@dataclass(frozen=True)
class ComplianceCase:
    id: str
    name: str
    systems: list[str]
    candidates: list[dict[str, str]]
    files: list[CaseFile]


class AnalyzerApiClient:
    def __init__(self, config: Config):
        self.config = config
        self.token = ""

    def request(self, method: str, path: str, body: dict | None = None, retry: bool = True) -> dict | list:
        if not self.token:
            self.login()
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        request = urllib.request.Request(
            f"{self.config.api_base}/local-analyzer{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code == 401 and retry:
                self.token = ""
                return self.request(method, path, body, retry=False)
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"分析API {error.code}: {detail}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"無法連線分析API：{error.reason}") from error

    def login(self) -> None:
        data = json.dumps({
            "username": self.config.username,
            "password": self.config.password,
        }, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(
            f"{self.config.api_base}/auth/login",
            data=data,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code == 401:
                raise RuntimeError("系統登入失敗，請檢查本機分析器的帳號與密碼。") from error
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"登入API {error.code}: {detail}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"無法連線登入API：{error.reason}") from error
        self.token = str(payload.get("token", ""))
        if not self.token:
            raise RuntimeError("登入API未回傳工作階段憑證。")

    def pending_cases(self) -> list[ComplianceCase]:
        payload = self.request("GET", "/cases")
        return [self._parse_case(item) for item in payload] if isinstance(payload, list) else []

    def get_case(self, case_id: str) -> ComplianceCase:
        payload = self.request("GET", f"/cases/{case_id}")
        if not isinstance(payload, dict):
            raise RuntimeError("分析API回傳的案件格式錯誤。")
        return self._parse_case(payload)

    def update_case_status(self, case_id: str, status: str, highest_risk: str | None = None) -> None:
        body = {"status": status}
        if highest_risk:
            body["highestRisk"] = highest_risk
        self.request("PATCH", f"/cases/{case_id}/status", body)

    def save_results(
        self,
        case: ComplianceCase,
        requirements: list[tuple[str, Requirement]],
    ) -> None:
        payload = [
            {"file": file_name, **requirement.to_dict()}
            for file_name, requirement in requirements
        ]
        for start in range(0, len(payload), 20):
            self.request("POST", f"/cases/{case.id}/results", {
                "systems": case.systems,
                "requirements": payload[start:start + 20],
            })

    def download(self, file: CaseFile, destination: Path) -> None:
        request = urllib.request.Request(file.url, headers={"User-Agent": "EM-DataSystem-LocalAnalyzer/0.2"})
        with urllib.request.urlopen(request, timeout=120) as response:
            destination.write_bytes(response.read())

    @staticmethod
    def _parse_case(payload: dict) -> ComplianceCase:
        return ComplianceCase(
            id=str(payload["id"]),
            name=str(payload.get("caseName") or payload["id"]),
            systems=[str(item) for item in payload.get("systems", [])],
            candidates=payload.get("candidates", []),
            files=[CaseFile(name=str(item["name"]), url=str(item["url"])) for item in payload.get("files", [])],
        )
