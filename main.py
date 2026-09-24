from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from database import engine, get_db, Base
from models import Sale, User
from schemas import SaleCreate, SaleOut, Stats, UserCreate, UserLogin

Base.metadata.create_all(bind=engine)

SECRET_KEY = "your-secret-key-change-this-in-production-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Учёт продаж S7")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        return RedirectResponse(url="/login", status_code=303)
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return RedirectResponse(url="/login", status_code=303)
    except JWTError:
        return RedirectResponse(url="/login", status_code=303)
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        return RedirectResponse(url="/login", status_code=303)
    
    return user


# ===== Страницы =====
@app.get("/", response_class=HTMLResponse)
def index(request: Request, user: User = Depends(get_current_user)):
    if isinstance(user, RedirectResponse):
        return user
    return templates.TemplateResponse(request, "index.html", {"user": user})

@app.get("/report", response_class=HTMLResponse)
def report(request: Request, user: User = Depends(get_current_user)):
    if isinstance(user, RedirectResponse):
        return user
    return templates.TemplateResponse(request, "report.html", {"user": user})

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


# ===== API: Авторизация =====
@app.post("/api/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    access_token = create_access_token(data={"sub": user.username})
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(key="access_token", value=access_token, httponly=True, max_age=28800)
    return response

@app.post("/api/logout")
def logout():
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie("access_token")
    return response


# ===== API: Продажи =====
@app.get("/api/sales", response_model=list[SaleOut])
def get_sales(
    skip: int = 0,
    limit: int = 100,
    start_date: str = None,
    end_date: str = None,
    agent: str = None,
    service: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    
    query = db.query(Sale)
    if start_date:
        query = query.filter(Sale.date >= start_date)
    if end_date:
        query = query.filter(Sale.date <= end_date)
    if agent:
        query = query.filter(Sale.agent == agent)
    if service:
        query = query.filter(Sale.service == service)

    return (
        query
        .order_by(Sale.date.desc(), Sale.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

@app.post("/api/sales", response_model=list[SaleOut], status_code=201)
def create_sales(
    sales: list[SaleCreate], 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    
    db_sales = []
    for sale in sales:
        db_sale = Sale(
            flight=str(sale.flight),
            service=sale.service,
            quantity=sale.quantity,
            agent=sale.agent,
            date=sale.date,
        )
        db.add(db_sale)
        db_sales.append(db_sale)
    
    db.commit()
    for s in db_sales:
        db.refresh(s)
    
    return db_sales

@app.delete("/api/sales/{sale_id}")
def delete_sale(
    sale_id: int, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Только админ может удалять")
    
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Продажа не найдена")
    db.delete(sale)
    db.commit()
    return {"ok": True}

@app.delete("/api/sales")
def clear_all_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Только админ может удалять")
    
    db.query(Sale).delete()
    db.commit()
    return {"ok": True}


@app.get("/api/stats", response_model=Stats)
def get_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    
    total_count = db.query(func.sum(Sale.quantity)).scalar() or 0
    total_quantity = total_count
    unique_flights = db.query(func.count(func.distinct(Sale.flight))).scalar() or 0
    unique_services = db.query(func.count(func.distinct(Sale.service))).scalar() or 0
    unique_agents = db.query(func.count(func.distinct(Sale.agent))).scalar() or 0

    return Stats(
        total_count=total_count,
        total_quantity=total_quantity,
        unique_flights=unique_flights,
        unique_services=unique_services,
        unique_agents=unique_agents,
    )


# ===== API: Управление пользователями =====
@app.get("/api/users")
def get_users(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Только админ")
    
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]

@app.post("/api/users")
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if isinstance(user, RedirectResponse):
        return user
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Только админ")
    
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    
    new_user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role}


# ===== Создание админа при первом запуске =====
def create_initial_admin():
    db = next(get_db())
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("✅ Создан админ: admin / admin123")

create_initial_admin()