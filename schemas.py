from pydantic import BaseModel, Field, ConfigDict
from datetime import date

class SaleCreate(BaseModel):
    flight: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    service: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    agent: str = Field(..., min_length=1)
    date: date

class SaleOut(BaseModel):
    id: int
    flight: str
    service: str
    quantity: int
    agent: str
    date: date

    model_config = ConfigDict(from_attributes=True, coerce_numbers_to_str=True)

class Stats(BaseModel):
    total_count: int
    total_quantity: int
    unique_flights: int
    unique_services: int
    unique_agents: int

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "agent"

class UserLogin(BaseModel):
    username: str
    password: str