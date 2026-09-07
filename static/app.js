const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU');
const MAX_SALES = 5; // Максимальное количество строк
let rowCounter = 0;

function addSaleRow() {
  // Проверяем максимальное количество
  const currentRows = document.querySelectorAll('.sale-row').length;
  if (currentRows >= MAX_SALES) {
    alert(`Можно добавить максимум ${MAX_SALES} продаж`);
    return;
  }

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
        <input type="date" name="date" required
               value="${new Date().toISOString().split('T')[0]}"
               oninput="validateForm()">
      </div>
      <div class="form-field">
        <label>Услуга</label>
        <select name="service" required onchange="validateForm()">
          <option value="">Выберите услугу</option>
          <option value="UPGR">UPGR</option>
          <option value="SLEEP">SLEEP</option>
          <option value="SEAT">SEAT</option>
          <option value="EXTRA">EXTRA</option>
        </select>
      </div>
      <div class="form-field">
        <label>Количество</label>
        <input type="number" name="quantity" min="1" value="1" required oninput="validateForm()">
      </div>
      <div class="form-field">
        <label>Агент</label>
        <select name="agent" required onchange="validateForm()">
          <option value="">Выберите агента</option>
          <option value="ТРОПИНА">ТРОПИНА</option>
          <option value="САМАРИНА">САМАРИНА</option>
          <option value="НАГАБЕДЯН">НАГАБЕДЯН</option>
          <option value="ГОЛУБЫХ">ГОЛУБЫХ</option>
          <option value="ДЕМЕНТЬЕВ">ДЕМЕНТЬЕВ</option>
          <option value="ТИМОФЕЕВ">ТИМОФЕЕВ</option>
          <option value="БРАГИН">БРАГИН</option>
          <option value="ХАИРОВ">ХАИРОВ</option>
        </select>
      </div>
    </div>
  `;

  container.appendChild(row);
  validateForm();
  updateAddButton(); // Обновляем состояние кнопки добавления
}

function removeSaleRow(btn) {
  btn.closest('.sale-row').remove();
  
  // Обновляем нумерацию
  const rows = document.querySelectorAll('.sale-row');
  rows.forEach((r, idx) => {
    r.querySelector('.sale-row-title').textContent = `Продажа #${idx + 1}`;
  });
  
  validateForm();
  updateAddButton(); // Показываем кнопку добавления, если стало меньше 5
}

function updateAddButton() {
  const currentRows = document.querySelectorAll('.sale-row').length;
  const addBtn = document.getElementById('addRowBtn');
  
  if (currentRows >= MAX_SALES) {
    addBtn.style.display = 'none'; // Скрываем кнопку, если достигли лимита
  } else {
    addBtn.style.display = 'block'; // Показываем кнопку
  }
}

function validateForm() {
  const rows = document.querySelectorAll('.sale-row');
  const submitBtn = document.getElementById('submitBtn');

  let allValid = rows.length > 0;

  rows.forEach(row => {
    const flight = row.querySelector('input[name="flight"]').value.trim();
    const date = row.querySelector('input[name="date"]').value;
    const service = row.querySelector('select[name="service"]').value;
    const agent = row.querySelector('select[name="agent"]').value;
    const quantity = row.querySelector('input[name="quantity"]').value;

    if (!/^\d{4}$/.test(flight)) allValid = false;
    if (!date || !service || !agent || !quantity || +quantity < 1) allValid = false;
  });

  submitBtn.disabled = !allValid;
}

// Обработчик отправки формы
document.getElementById('salesForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const rows = document.querySelectorAll('.sale-row');
  const sales = [];

  rows.forEach(row => {
    sales.push({
      flight: row.querySelector('input[name="flight"]').value.trim(),
      date: row.querySelector('input[name="date"]').value,
      service: row.querySelector('select[name="service"]').value,
      agent: row.querySelector('select[name="agent"]').value,
      quantity: +row.querySelector('input[name="quantity"]').value,
    });
  });

  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sales),
    });

    if (res.ok) {
      const data = await res.json();
      
      // Очищаем форму и добавляем одну пустую строку
      document.getElementById('salesContainer').innerHTML = '';
      rowCounter = 0;
      addSaleRow();
      renderRecent();
    } else {
      const errorData = await res.json().catch(() => ({}));
      alert(`Ошибка ${res.status}: ${errorData.detail || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    alert('Ошибка соединения с сервером: ' + error.message);
  }
});

// Обработчик кнопки "Добавить ещё продажу"
document.getElementById('addRowBtn').addEventListener('click', addSaleRow);

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
        <span class="recent-details">${s.service} • ${s.agent} • ${formatDate(s.date)}</span>
      </div>
      <span class="recent-quantity">× ${s.quantity}</span>
    </li>
  `).join('');
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  addSaleRow();
  renderRecent();
  updateAddButton();
});