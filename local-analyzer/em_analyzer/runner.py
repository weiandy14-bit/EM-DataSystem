from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

from .config import Config
from .documents import extract_segments
from .api import AnalyzerApiClient, ComplianceCase
from .rules import Requirement, extract_requirements


RISK_ORDER = {"通過": 0, "未判定": 1, "注意": 2, "無法判定": 3, "高風險": 4, "不符合": 5}
CASE_RISK = {"通過": "低", "未判定": "未判定", "注意": "中", "無法判定": "中", "高風險": "高", "不符合": "重大"}


class AnalyzerRunner:
    def __init__(self, config: Config, client: AnalyzerApiClient | None = None):
        self.config = config
        self.client = client or AnalyzerApiClient(config)
        for name in ("pending", "processing", "completed", "failed", "reports"):
            (config.data_dir / name).mkdir(parents=True, exist_ok=True)

    def run_once(self, case_id: str | None = None) -> int:
        cases = [self.client.get_case(case_id)] if case_id else self.client.pending_cases()
        if not cases:
            print("目前沒有待分析案件。")
            return 0
        failures = 0
        for case in cases:
            try:
                self.process_case(case)
            except Exception as error:
                failures += 1
                print(f"[失敗] {case.name}: {error}")
                try:
                    self.client.update_case_status(case.id, "待分析")
                except Exception as status_error:
                    print(f"[警告] 無法將案件恢復為待分析：{status_error}")
                self._move_case_folder("processing", "failed", case)
                self._move_case_folder("pending", "failed", case)
        return failures

    def process_case(self, case: ComplianceCase) -> None:
        if not case.files:
            raise ValueError("案件沒有可下載的原始規範附件。")
        print(f"[開始] {case.name}（{len(case.files)} 份文件）")
        self.client.update_case_status(case.id, "分析中")
        case_folder = safe_name(f"{case.name}_{case.id[:8]}")
        pending_dir = self.config.data_dir / "pending" / case_folder
        processing_dir = self.config.data_dir / "processing" / case_folder
        if pending_dir.exists():
            shutil.rmtree(pending_dir)
        pending_dir.mkdir(parents=True)

        downloaded: list[Path] = []
        for file in case.files:
            destination = pending_dir / safe_name(file.name)
            print(f"  下載：{file.name}")
            self.client.download(file, destination)
            downloaded.append(destination)

        if processing_dir.exists():
            shutil.rmtree(processing_dir)
        pending_dir.replace(processing_dir)
        requirements: list[tuple[str, Requirement]] = []
        for original in downloaded:
            path = processing_dir / original.name
            segments = extract_segments(path)
            found = extract_requirements(segments)
            print(f"  解析：{path.name}，{len(segments)} 段，辨識 {len(found)} 項條件")
            requirements.extend((path.name, item) for item in found)

        report = self._build_report(case, requirements)
        report_path = self.config.data_dir / "reports" / f"{case_folder}.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        self._write_markdown(report_path.with_suffix(".md"), case, requirements)

        self.client.save_results(case, requirements)

        worst = max((item.risk for _, item in requirements), key=lambda value: RISK_ORDER.get(value, 0), default="未判定")
        self.client.update_case_status(case.id, "待覆核", CASE_RISK[worst])
        self._move_case_folder("processing", "completed", case)
        print(f"[完成] {case.name}：{len(requirements)} 項條件，案件已改為待覆核。")

    def _build_report(self, case: ComplianceCase, requirements: list[tuple[str, Requirement]]) -> dict:
        return {
            "case_id": case.id,
            "case_name": case.name,
            "analyzed_at": datetime.now().astimezone().isoformat(),
            "systems": case.systems,
            "candidates": case.candidates,
            "summary": {
                "files": len(case.files),
                "requirements": len(requirements),
                "cns_references": sum(1 for _, item in requirements if item.standard_ref.startswith("CNS")),
                "market_checks": sum(1 for _, item in requirements if item.market_check),
            },
            "requirements": [{"file": file_name, **item.to_dict()} for file_name, item in requirements],
            "notice": "本機規則分析僅供初篩。CNS有效性、法規適用性及三家產品符合度必須完成官方或原廠證據查核。",
        }

    @staticmethod
    def _write_markdown(path: Path, case: ComplianceCase, requirements: list[tuple[str, Requirement]]) -> None:
        lines = [
            f"# {case.name}－本機初步分析",
            "",
            f"- 文件數：{len(case.files)}",
            f"- 辨識條件：{len(requirements)}",
            f"- CNS引用：{sum(1 for _, item in requirements if item.standard_ref.startswith('CNS'))}",
            "",
            "> 本報告為規則式初篩；CNS有效性、法規適用性及三家產品符合度仍須查證。",
            "",
        ]
        for index, (file_name, item) in enumerate(requirements, start=1):
            lines.extend([
                f"## {index}. {item.title}",
                "",
                f"- 文件／位置：{file_name}／{item.location}",
                f"- 類型：{item.condition_type}",
                f"- 風險：{item.risk}",
                f"- 擷取值：{item.matched_text}",
                f"- 判定理由：{item.reason}",
                f"- 建議：{item.suggestion}",
                "",
                f"> {item.source_text}",
                "",
            ])
        path.write_text("\n".join(lines), encoding="utf-8")

    def _move_case_folder(self, source: str, target: str, case: ComplianceCase) -> None:
        case_folder = safe_name(f"{case.name}_{case.id[:8]}")
        source_path = self.config.data_dir / source / case_folder
        if not source_path.exists():
            return
        target_path = self.config.data_dir / target / case_folder
        if target_path.exists():
            shutil.rmtree(target_path)
        source_path.replace(target_path)


def safe_name(value: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", value).strip(" .")
    return cleaned[:150] or "unnamed"
