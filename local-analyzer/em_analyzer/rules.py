from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from .documents import Segment


@dataclass(frozen=True)
class Requirement:
    title: str
    condition_type: str
    matched_text: str
    source_text: str
    location: str
    page: int | None
    standard_ref: str
    normalized_value: float | None
    unit: str
    risk: str
    reason: str
    suggestion: str
    market_check: bool
    human_check: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


RULES: tuple[dict, ...] = (
    {
        "name": "CNS引用",
        "type": "標準認證",
        "pattern": re.compile(r"(?<![A-Z])CNS\s*[-–—]?\s*([0-9]{2,6}(?:[-–—][0-9]+)?)(?![0-9])", re.I),
        "risk": "無法判定",
        "reason": "已辨識CNS引用；必須向官方來源查核有效版本、廢止及取代關係。",
        "suggestion": "完成CNS官方查核後，再決定保留原引用或改列目前有效的適用標準。",
        "market": False,
    },
    {
        "name": "其他標準或認證",
        "type": "標準認證",
        "pattern": re.compile(r"(?<![A-Z])(?:IEC|JIS|SAS|NFPA|UL|FM|ISO|EN|BS|NEMA)\s*[-–—]?\s*[A-Z0-9][A-Z0-9.\-/]*(?:\s*\([^)]+\))?", re.I),
        "risk": "注意",
        "reason": "特定標準或認證可能形成市場限制，需確認適用性、版本及等效標準。",
        "suggestion": "以必要功能及性能為主，列出適用標準；如允許等效標準，應明定等效判定基準。",
        "market": True,
    },
    {
        "name": "尺寸或公差",
        "type": "尺寸公差",
        "pattern": re.compile(r"\d+(?:\.\d+)?\s*(?:mm|cm|m)\s*[x×X＊*]\s*\d+(?:\.\d+)?\s*(?:mm|cm|m)?|\d+(?:\.\d+)?\s*(?:mm|cm)", re.I),
        "risk": "注意",
        "reason": "精確尺寸可能源自必要介面，也可能對應特定產品外形或開孔。",
        "suggestion": "確認既有介面或設計計算；若非必要，改以最大占用空間、安裝相容性或功能需求表達。",
        "market": True,
    },
    {
        "name": "壓力或溫度",
        "type": "壓力溫度",
        "pattern": re.compile(r"\d+(?:\.\d+)?\s*(?:MPa|kPa|bar|kgf/cm(?:2|²)|℃|°C)", re.I),
        "risk": "注意",
        "reason": "壓力或溫度數值需與設計條件、試驗方式及安全裕度相符。",
        "suggestion": "以設計條件及適用標準所需的最低性能表達，並註明試驗方式。",
        "market": True,
    },
    {
        "name": "百分比或倍率",
        "type": "百分比倍率",
        "pattern": re.compile(r"\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*倍"),
        "risk": "注意",
        "reason": "百分比或倍率條件需有標準、計算或安全需求支持。",
        "suggestion": "補充作用對象、持續時間、試驗方法及設計或標準依據。",
        "market": True,
    },
    {
        "name": "持續時間",
        "type": "持續時間",
        "pattern": re.compile(r"\d+(?:\.\d+)?\s*(?:秒|分鐘|小時|sec(?:ond)?s?|min(?:ute)?s?|hours?|hr)", re.I),
        "risk": "注意",
        "reason": "持續時間與其他性能條件組合後可能縮小可用產品範圍。",
        "suggestion": "說明持續時間的試驗依據及達成後允許狀態。",
        "market": True,
    },
    {
        "name": "迴路或點數容量",
        "type": "容量點數迴路",
        "pattern": re.compile(r"\d+\s*L(?![A-Z0-9])|\d+\s*(?:迴路|回路|點|區|zones?|loops?)", re.I),
        "risk": "注意",
        "reason": "精確容量級距可能直接對應特定廠牌型號，需核對實際需求及備用量。",
        "suggestion": "改以實際需求、合理備用比例、每迴路點數及擴充能力表達。",
        "market": True,
    },
    {
        "name": "電氣性能數值",
        "type": "性能效率",
        "pattern": re.compile(r"\d+(?:\.\d+)?\s*(?:kW|W|kVA|VA|V|A|Hz|kHz|MHz|rpm)\b", re.I),
        "risk": "注意",
        "reason": "電氣性能數值需核對系統設計需求，並避免不必要的精確產品級距。",
        "suggestion": "以系統所需最低性能、容許範圍及適用試驗標準表達。",
        "market": True,
    },
    {
        "name": "介面或通訊協定",
        "type": "介面通訊",
        "pattern": re.compile(r"(?<![A-Z])(?:Modbus(?:\s+RTU|\s+TCP)?|BACnet(?:/IP|\s+MS/TP)?|PROFIBUS|PROFINET|EtherNet/IP|RS[- ]?485|RS[- ]?232|CANopen|LonWorks)(?![A-Z])", re.I),
        "risk": "注意",
        "reason": "指定介面或通訊協定可能是必要整合條件，也可能排除功能等效產品。",
        "suggestion": "說明上位系統整合需求、資料點、速率與閘道器是否可接受。",
        "market": True,
    },
    {
        "name": "排他性文字",
        "type": "其他",
        "pattern": re.compile(r"(?:僅限|限用|唯一|不得替代|完全相同|指定廠牌|須為|必須採用)"),
        "risk": "高風險",
        "reason": "排他性措辭可能限制功能等效產品參與。",
        "suggestion": "除非有法規、安全或既有介面依據，改以功能、性能及驗收條件表達。",
        "market": True,
    },
    {
        "name": "型式代號",
        "type": "型式代號",
        "pattern": re.compile(r"(?<![A-Z])[A-Z]{1,5}[- ]?型", re.I),
        "risk": "注意",
        "reason": "型式代號可能來自特定地區標準或產品分類，需拆解為臺灣適用的必要功能。",
        "suggestion": "確認代號定義及適用依據，改列共同必要功能與臺灣認可要求。",
        "market": True,
    },
)


def extract_requirements(segments: list[Segment]) -> list[Requirement]:
    results: list[Requirement] = []
    seen: set[tuple[str, str, str]] = set()
    for segment in segments:
        for rule in RULES:
            for match in rule["pattern"].finditer(segment.text):
                matched = match.group(0).strip()
                key = (segment.location, rule["type"], matched.casefold())
                if key in seen:
                    continue
                seen.add(key)
                standard_ref = normalize_standard(matched) if rule["type"] == "標準認證" else ""
                value, unit = parse_number_unit(matched)
                results.append(Requirement(
                    title=f"{rule['name']}：{matched}"[:100],
                    condition_type=rule["type"],
                    matched_text=matched,
                    source_text=segment.text[:1900],
                    location=segment.location,
                    page=segment.page,
                    standard_ref=standard_ref,
                    normalized_value=value,
                    unit=unit,
                    risk=rule["risk"],
                    reason=rule["reason"],
                    suggestion=rule["suggestion"],
                    market_check=rule["market"],
                ))
    return results


def normalize_standard(value: str) -> str:
    return re.sub(r"\s+", " ", value.upper().replace("–", "-").replace("—", "-")).strip()


def parse_number_unit(value: str) -> tuple[float | None, str]:
    number = re.search(r"\d+(?:\.\d+)?", value)
    if not number:
        return None, ""
    units = re.findall(r"(?:MPa|kPa|bar|kgf/cm(?:2|²)|℃|°C|mm|cm|kW|kVA|VA|W|V|A|Hz|kHz|MHz|rpm|%|倍|秒|分鐘|小時|L|迴路|回路|點|區)", value, re.I)
    return float(number.group(0)), " × ".join(units)
