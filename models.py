from sqlalchemy import Column, Integer, String, Date
from database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    flight = Column(String(4), nullable=False)
    service = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    agent = Column(String, nullable=False)