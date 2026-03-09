"""
Axiskey IR Agent — Entry Point
Industry FinTech (IFT)

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from config.settings import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)

app = FastAPI(
    title="Axiskey IR Agent",
    description=(
        "AI-powered Investor Relations agent for Industry FinTech (IFT). "
        "Automatically resolves investor inquiries from Zendesk, email, and the Tribexa portal."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": "Axiskey IR Agent",
        "company": "Industry FinTech (IFT)",
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )
