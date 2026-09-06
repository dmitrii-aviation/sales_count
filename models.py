from sqlalchemy import Column, Integer, String, Float, Date
from database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    flight = Column(Integer, nullable=False)  # номер рейса
    service = Column(String, nullable=False)    # услуга из списка
    quantity = Column(Integer, nullable=False) # количество
    date = Column(Date, nullable=False) # дата рейса