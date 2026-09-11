#!/usr/bin/env python3
"""
Development startup script.
Run: python run.py

Port 8001 is used because port 8000 is occupied by Splunk on this machine.
Change BACKEND_PORT below or set the PORT env var to override.
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
