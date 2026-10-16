#!/usr/bin/env python
"""
Seed the database with demo documents for testing.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ingestion_service import IngestionService


async def main():
    demo_dir = Path(__file__).parent.parent / "demo_documents"
    if not demo_dir.exists():
        print(f"Demo directory not found at {demo_dir}")
        print("Create demo_documents/ folder with PDF files to seed.")
        sys.exit(1)

    pdf_files = list(demo_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {demo_dir}")
        sys.exit(1)

    print(f"Found {len(pdf_files)} PDF files to upload")

    service = IngestionService()
    try:
        file_objects = [open(f, "rb") for f in pdf_files]
        filenames = [f.name for f in pdf_files]

        results = await service.ingest_documents(file_objects, filenames)

        for r in results:
            status = "✓" if r["status"] == "ready" else "✗"
            print(f"  {status} {r['filename']}: {r['status']}")
            if r.get("error"):
                print(f"    Error: {r['error']}")

    finally:
        for f in file_objects:
            f.close()
        await service.close()

    print("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(main())