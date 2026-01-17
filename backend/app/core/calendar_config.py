from typing import Optional
from pydantic_settings import BaseSettings


class CalendarSettings(BaseSettings):
    base_url: Optional[str] = None  # CALENDAR_BASE_URL (ex: https://mon-projet-calendrier.vercel.app)
    default_calendars: str = "adrien,clement"  # CALENDAR_DEFAULT_CALENDARS
    max_range_days: int = 90  # CALENDAR_MAX_RANGE_DAYS

    class Config:
        env_prefix = "CALENDAR_"
        env_file = ".env"


_calendar_settings: CalendarSettings | None = None


def get_calendar_settings() -> CalendarSettings:
    global _calendar_settings
    if _calendar_settings is None:
        _calendar_settings = CalendarSettings()
    return _calendar_settings


