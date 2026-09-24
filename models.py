from sqlalchemy import Column, Integer, String, Date
from database import Base

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    flight = Column(String, index=True)
    service = Column(String, index=True)
    quantity = Column(Integer)
    agent = Column(String, index=True)
    date = Column(Date, index=True)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="agent")  # "admin" или "agent"