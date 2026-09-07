from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import traceback

from database import engine, get_db, Base
from models import Sale
from schemas import SaleCreate, SaleOut, Stats

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Учёт продаж S7")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
def index():
    with open("static/index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/report", response_class=HTMLResponse)
def report():
    with open("static/report.html", encoding="utf-8") as f:
        return f.read()


@app.get("/api/sales", response_model=list[SaleOut])
def get_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(Sale)
        .order_by(Sale.date.desc(), Sale.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.post("/api/sales", response_model=list[SaleOut], status_code=201)
def create_sales(sales: list[SaleCreate], db: Session = Depends(get_db)):
    try:
        print(f"📥 Получены данные: {sales}")
        
        db_sales = []
        for sale in sales:
            # Конвертируем строку даты в объект date, если нужно
            date_value = sale.date
            if isinstance(date_value, str):
                date_value = datetime.strptime(date_value, "%Y-%m-%d").date()
            
            db_sale = Sale(
                flight=sale.flight,
                service=sale.service,
                quantity=sale.quantity,
                date=date_value,
            )
            db.add(db_sale)
            db_sales.append(db_sale)
            print(f"✅ Добавлена продажа: {sale}")
        
        db.commit()
        for s in db_sales:
            db.refresh(s)
        
        print(f"🎉 Успешно сохранено {len(db_sales)} продаж")
        return db_sales
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка при сохранении: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Продажа не найдена")
    db.delete(sale)
    db.commit()
    return {"ok": True}


@app.delete("/api/sales")
def clear_all_sales(db: Session = Depends(get_db)):
    db.query(Sale).delete()
    db.commit()
    return {"ok": True}


@app.get("/api/stats", response_model=Stats)
def get_stats(db: Session = Depends(get_db)):
    total_count = db.query(Sale).count()
    unique_flights = db.query(func.count(func.distinct(Sale.flight))).scalar() or 0
    unique_services = db.query(func.count(func.distinct(Sale.service))).scalar() or 0

    return Stats(
        total_count=total_count,
        unique_flights=unique_flights,
        unique_services=unique_services,
    )