import unittest

from em_analyzer.api import AnalyzerApiClient


class ApiMappingTests(unittest.TestCase):
    def test_parses_case_files_systems_and_candidates(self):
        payload = {
            "id": "case-id",
            "caseName": "16266變頻器",
            "systems": ["電力"],
            "candidates": [{"brand": "ABB"}],
            "files": [{"name": "16266變頻器.docx", "url": "https://example.test/file.docx"}],
        }

        case = AnalyzerApiClient._parse_case(payload)

        self.assertEqual(case.name, "16266變頻器")
        self.assertEqual(case.systems, ["電力"])
        self.assertEqual(case.candidates, [{"brand": "ABB"}])
        self.assertEqual(case.files[0].name, "16266變頻器.docx")


if __name__ == "__main__":
    unittest.main()
