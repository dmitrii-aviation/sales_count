const formatMoney = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU');

let rowCounter = 0;

// ===== Добавление строки продажи =====
function addSaleRow() {
  rowCounter++;
  const container = document.getElementById('salesContainer');
  const row = document.createElement('div');
  row.className = 'sale-row';
  row.dataset.rowId = rowCounter;

  row.innerHTML = `
    <div class="sale-row-header">
      <span class="sale-row-title">Продажа #${rowCounter}</span>
      ${rowCounter > 1 ? '<button type="button" class="remove-row-btn" onclick="removeSaleRow(this)">×</button>' : ''}
    </div>
    <div class="form-grid">
      <div class="form-field">
        <label>Рейс</label>
        <input type="text" name="flight" maxlength="4" pattern="\\d{4}" 
               placeholder="1234" required oninput="validateForm()">
      </div>
      <div class="form-field">
        <label>Дата</label>
        <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}" 
               oninput="validateForm()">
      </div>
      <div class="form-field">
        <label>Услуга</label>
        <select name="service" required onchange="validateForm()">
          <option value="">Выберите услугу</option>
          <option value="X">X</option>
          <option value="Y">Y</option>
          <option value="Z">Z</option>
        </select>
      </div>
      <div class="form-field">
        <label>Количество</label>
        <input type="number" name="quantity" min="1" value="1" required oninput="validateForm()">
      </div>
    </div>
  `;

  container.appendChild(row);
  validateForm();
}

// ===== Удаление строки =====
function removeSaleRow(btn) {
  const row = btn.closest('.sale-row');
  row.remove();
  
  // Обновляем нумерацию
  const rows = document.querySelectorAll('.sale-row');
  rows.forEach((r, idx) => {
    r.querySelector('.sale-row-title').textContent = `Продажа #${idx + 1}`;
  });
  
  validateForm();
}

// ===== Валидация формы =====
function validateForm() {
  const rows = document.querySelectorAll('.sale-row');
  const submitBtn = document.getElementById('submitBtn');
  
  let allValid = true;
  
  rows.forEach(row => {
    const flight = row.querySelector('input[name="flight"]').value.trim();
    const date = row.querySelector('input[name="date"]').value;
    const service = row.querySelector('select[name="service"]').value;
    const quantity = row.querySelector('input[name="quantity"]').value;
    
    // Проверка рейса (ровно 4 цифры)
    if (!/^\d{4}$/.test(flight)) {
      allValid = false;
    }
    
    // Проверка остальных полей
    if (!date || !service || !quantity || +quantity < 1) {
      allValid = false;
    }
  });
  
  submitBtn.disabled = !allValid;
}

// ===== Отправка формы =====
document.getElementById('salesForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const rows = document.querySelectorAll('.sale-row');
  const sales = [];
  
  rows.forEach(row => {
    sales.push({
      flight: row.querySelector('input[name="flight"]').value.trim(),
      date: row.querySelector('input[name="date"]').value,
      service: row.querySelector('select[name="service"]').value,
      quantity: +row.querySelector('input[name="quantity"]').value,
    });
  });
  
  const res = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sales),
  });
  
  if (res.ok) {
    // Очищаем форму, оставляем одну пустую строку
    document.getElementById('salesContainer').innerHTML = '';
    rowCounter = 0;
    addSaleRow();
    renderRecent();
  } else {
    alert('Ошибка при сохранении');
  }
});

// ===== Последние продажи =====
async function renderRecent() {
  const list = document.getElementById('recentList');
  if (!list) return;

  const res = await fetch('/api/sales?limit=5');
  const sales = await res.json();

  if (!sales.length) {
    list.innerHTML = '<li class="empty">Пока нет продаж</li>';
    return;
  }
  
  list.innerHTML = sales.map(s => `
    <li>
      <div class="recent-info">
        <span class="recent-flight">Рейс ${s.flight}</span>
        <span class="recent-details">${s.service} • ${formatDate(s.date)}</span>
      </div>
      <span class="recent-quantity">× ${s.quantity}</span>
    </li>
  `).join('');
}