from __future__ import annotations

import argparse
import sys
import time

from .config import Config
from .runner import AnalyzerRunner


def main() -> int:
    parser = argparse.ArgumentParser(description="EM-DataSystem 本機規範分析器")
    parser.add_argument("--watch", action="store_true", help="持續監看Notion待分析案件")
    parser.add_argument("--case-id", help="只分析指定Notion案件頁面ID")
    args = parser.parse_args()

    try:
        config = Config.from_env()
    except (ValueError, OSError) as error:
        print(f"設定錯誤：{error}")
        return 2

    runner = AnalyzerRunner(config)
    if not args.watch:
        try:
            return 1 if runner.run_once(args.case_id) else 0
        except Exception as error:
            print(f"無法執行分析：{error}")
            return 1

    print(f"本機分析器已啟動，每 {config.poll_seconds} 秒檢查一次。按 Ctrl+C 可停止。")
    try:
        while True:
            runner.run_once()
            time.sleep(config.poll_seconds)
    except KeyboardInterrupt:
        print("\n本機分析器已停止。")
        return 0
    except Exception as error:
        print(f"分析器發生錯誤：{error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
