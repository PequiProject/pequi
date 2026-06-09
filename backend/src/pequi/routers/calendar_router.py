from datetime import date

from auth import get_current_user
from fastapi import APIRouter, Depends
from models.user import User

router = APIRouter()


@router.get("/summary")
async def get_month_summary(year: int, month: int, current_user: User = Depends(get_current_user)):

    return {
        "2026-05-24": ["checkin", "appointment"],
        "2026-05-25": ["checkin"],
    }


@router.get("/day-details")
async def get_day_details(target_date: date, current_user: User = Depends(get_current_user)):
    return {
        "date": target_date,
        "events": [
            {"type": "checkin", "title": "Check-in matinal", "time": "08:00"},
            {"type": "appointment", "title": "Consulta com Dr. Silva", "time": "14:30"},
        ],
    }
