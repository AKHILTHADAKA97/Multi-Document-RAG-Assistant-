#!/usr/bin/env python
"""
Run evaluation against the golden dataset.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.evaluation_service import EvaluationService


async def main():
    dataset_path = Path(__file__).parent.parent / "tests" / "evaluation" / "dataset.json"

    if not dataset_path.exists():
        print(f"Dataset not found at {dataset_path}")
        print("Please create the dataset first.")
        sys.exit(1)

    service = EvaluationService(str(dataset_path))
    results = await service.run_evaluation()
    service.print_results(results)


if __name__ == "__main__":
    asyncio.run(main())