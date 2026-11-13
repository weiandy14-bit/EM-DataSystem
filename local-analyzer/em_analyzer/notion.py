from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Config
from .rules import Requirement


NOTION_VERSION = "2022-06-28"


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


class NotionClient:
    def __init__(self, config: Config):
        self.config = config

    def request(self, method: str, path: str, body: dict | None = None) -> dict:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        request = urllib.request.Request(
            f"https://api.notion.com/v1{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.config.notion_token}",
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Notion API {error.code}: {detail}") from error

    def pending_cases(self) -> list[ComplianceCase]:
        payload = self.request("POST", f"/databases/{self.config.cases_db}/query", {
            "filter": {"property": "狀態", "status": {"equals": "待分析"}},
            "sorts": [{"timestamp": "created_time", "direction": "ascending"}],
            "page_size": 20,
        })
        return [self._parse_case(page) for page in payload.get("results", [])]

    def get_case(self, case_id: str) -> ComplianceCase:
        return self._parse_case(self.request("GET", f"/pages/{case_id}"))

    def update_case_status(self, case_id: str, status: str, highest_risk: str | None = None) -> None:
        properties: dict[str, Any] = {"狀態": {"status": {"name": status}}}
        if highest_risk:
            properties["最高風險"] = {"select": {"name": highest_risk}}
        if status == "待覆核":
            from datetime import datetime, timezone
            properties["分析日期"] = {"date": {"start": datetime.now(timezone.utc).isoformat()}}
        self.request("PATCH", f"/pages/{case_id}", {"properties": properties})

    def download(self, file: CaseFile, destination: Path) -> None:
        request = urllib.request.Request(file.url, headers={"User-Agent": "EM-DataSystem-LocalAnalyzer/0.1"})
        with urllib.request.urlopen(request, timeout=120) as response:
            destination.write_bytes(response.read())

    def upsert_requirement(self, case: ComplianceCase, file_name: str, requirement: Requirement) -> str:
        unique_title = f"{file_name}｜{requirement.location}｜{requirement.title}"[:180]
        existing = self._query_existing(
            self.config.requirements_db,
            case.id,
            "檢查案件",
            "規範條件",
            unique_title,
        )
        properties = {
            "規範條件": title(unique_title),
            "檢查案件": relation(case.id),
            "文件名稱": rich_text(file_name),
            "原始規範文字": rich_text(requirement.source_text),
            "章節頁碼": rich_text(f"第 {requirement.page} 頁" if requirement.page else requirement.location),
            "段落位置": rich_text(requirement.location),
            "條件類型": select(requirement.condition_type),
            "原始數值文字": rich_text(requirement.matched_text),
            "單位": rich_text(requirement.unit),
            "標準或法規編號": rich_text(requirement.standard_ref),
            "工程系統": {"multi_select": [{"name": system} for system in case.systems]},
            "需市場驗證": {"checkbox": requirement.market_check},
            "需人工確認": {"checkbox": requirement.human_check},
            "風險等級": select(requirement.risk),
            "判定理由": rich_text(requirement.reason),
            "建議中性文字": rich_text(requirement.suggestion),
            "處理狀態": {"status": {"name": "待覆核"}},
        }
        if requirement.normalized_value is not None:
            properties["標準化數值"] = {"number": requirement.normalized_value}
        if existing:
            self.request("PATCH", f"/pages/{existing}", {"properties": properties})
            return existing
        page = self.request("POST", "/pages", {
            "parent": {"database_id": self.config.requirements_db},
            "properties": properties,
        })
        return page["id"]

    def upsert_cns_check(
        self,
        case: ComplianceCase,
        requirement_id: str,
        file_name: str,
        requirement: Requirement,
    ) -> None:
        unique_title = f"{file_name}｜{requirement.location}｜{requirement.standard_ref}"[:180]
        existing = self._query_existing(
            self.config.cns_checks_db,
            case.id,
            "檢查案件",
            "CNS查核紀錄",
            unique_title,
        )
        properties = {
            "CNS查核紀錄": title(unique_title),
            "檢查案件": relation(case.id),
            "規範條件": relation(requirement_id),
            "文件原始引用": rich_text(requirement.matched_text),
            "正規化引用": rich_text(requirement.standard_ref),
            "查核結果": select("待查核"),
            "官方當時狀態": rich_text("本機已擷取引用，尚未完成官方來源查核"),
            "問題與處理建議": rich_text("必須查核CNS官方有效版本、廢止狀態及完整取代鏈。"),
            "查核完成": {"checkbox": False},
            "需人工確認": {"checkbox": True},
        }
        if existing:
            self.request("PATCH", f"/pages/{existing}", {"properties": properties})
        else:
            self.request("POST", "/pages", {
                "parent": {"database_id": self.config.cns_checks_db},
                "properties": properties,
            })

    def _query_existing(
        self,
        database_id: str,
        case_id: str,
        relation_property: str,
        title_property: str,
        title_value: str,
    ) -> str | None:
        payload = self.request("POST", f"/databases/{database_id}/query", {
            "filter": {"and": [
                {"property": relation_property, "relation": {"contains": case_id}},
                {"property": title_property, "title": {"equals": title_value}},
            ]},
            "page_size": 1,
        })
        results = payload.get("results", [])
        return results[0]["id"] if results else None

    @staticmethod
    def _parse_case(page: dict) -> ComplianceCase:
        props = page.get("properties", {})
        files: list[CaseFile] = []
        for item in props.get("原始規範", {}).get("files", []):
            kind = item.get("type")
            url = item.get(kind, {}).get("url") if kind in {"file", "external"} else None
            if url:
                files.append(CaseFile(name=item.get("name") or "規範文件", url=url))
        candidate_text = plain_text(props.get("候選產品資料"))
        try:
            candidates = json.loads(candidate_text) if candidate_text else []
        except json.JSONDecodeError:
            candidates = []
        return ComplianceCase(
            id=page["id"],
            name=plain_text(props.get("案件名稱")) or page["id"],
            systems=[item.get("name", "") for item in props.get("工程系統", {}).get("multi_select", []) if item.get("name")],
            candidates=candidates,
            files=files,
        )


def plain_text(prop: dict | None) -> str:
    if not prop:
        return ""
    values = prop.get(prop.get("type", ""), [])
    return "".join(item.get("plain_text", "") for item in values)


def rich_text(value: str) -> dict:
    chunks = [{"type": "text", "text": {"content": value[i:i + 2000]}} for i in range(0, len(value), 2000)]
    return {"rich_text": chunks}


def title(value: str) -> dict:
    return {"title": [{"type": "text", "text": {"content": value[:2000]}}]}


def select(value: str) -> dict:
    return {"select": {"name": value}}


def relation(page_id: str) -> dict:
    return {"relation": [{"id": page_id}]}
