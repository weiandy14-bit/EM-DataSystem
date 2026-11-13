import unittest

from em_analyzer.documents import Segment
from em_analyzer.rules import extract_requirements


class RuleExtractionTests(unittest.TestCase):
    def test_extracts_known_restrictive_conditions(self):
        segments = [Segment(
            text="多功能電表尺寸96mm×96mm，須具150%過載1分鐘，採Modbus RTU，並符合CNS 14674。",
            location="段落 12",
        )]

        results = extract_requirements(segments)
        types = {item.condition_type for item in results}

        self.assertIn("尺寸公差", types)
        self.assertIn("百分比倍率", types)
        self.assertIn("持續時間", types)
        self.assertIn("介面通訊", types)
        self.assertIn("標準認證", types)
        self.assertTrue(any(item.standard_ref == "CNS 14674" for item in results))

    def test_extracts_fire_loop_and_foreign_standard(self):
        segments = [Segment(
            text="受信總機應採GR型20L，並符合SAS 322 2.0MPa (20K)性能認證。",
            location="段落 8",
        )]

        results = extract_requirements(segments)

        self.assertTrue(any(item.condition_type == "容量點數迴路" and item.matched_text == "20L" for item in results))
        self.assertTrue(any(item.condition_type == "型式代號" for item in results))
        self.assertTrue(any(item.standard_ref.startswith("SAS 322") for item in results))
        self.assertTrue(any(item.condition_type == "壓力溫度" and "2.0MPa" in item.matched_text for item in results))


if __name__ == "__main__":
    unittest.main()
