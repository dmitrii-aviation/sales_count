from pydantic import BaseModel, Field


class SaleCreate(BaseModel):
    flight: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    service: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    date: str  # Принимаем как строку "YYYY-MM-DD"


class SaleOut(BaseModel):
    id: int
    flight: str
    service: str
    quantity: int
    date: str  # Возвращаем как строку

    class Config:
        from_attributes = True


class Stats(BaseModel):
    total_count: int
    unique_flights: int
    unique_services: int