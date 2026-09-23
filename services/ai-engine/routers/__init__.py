"""
Vyapaar GrowthOS API Routers.

Each module exposes a FastAPI ``APIRouter`` instance named ``router``
that is mounted in ``main.py`` with the appropriate prefix and tags.
"""

from routers import (
    voice,
    transactions,
    udhari,
    dashboard,
    forecast,
    payscore,
    customers,
    whatsapp,
    briefing,
    demo,
    paytm,
    invoices,
    inventory,
)

__all__ = [
    "voice",
    "transactions",
    "udhari",
    "dashboard",
    "forecast",
    "payscore",
    "customers",
    "whatsapp",
    "briefing",
    "demo",
    "paytm",
    "invoices",
    "inventory",
]
