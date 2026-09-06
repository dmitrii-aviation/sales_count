from pydantic import BaseModel, Field
from datetime import date
from typing import List


class SaleCreate(BaseModel):
    product: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    date: date


class SaleOut(SaleCreate):
    id: int
    total: float

    class Config:
        from_attributes = True


class Stats(BaseModel):
    total_count: int
    total_sum: float
    avg_check: float
    unique_products: int