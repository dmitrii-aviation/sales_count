const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Функция разворачивает продажу в отдельные строки по quantity
function expandSales(sales) {
  const expanded = [];
  sales.forEach(sale => {
    for (let i = 0; i < sale.quantity; i++) {
      expanded.push({ ...sale, quantity: 1 });
    }
  });
  return expanded;
}

// ===== Загрузка общей статистики =====
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const stats = await res.json();
    document.getElementById('uniqueFlights').textContent = stats.unique_flights;
    document.getElementById('uniqueAgents').textContent = stats.unique_agents;
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
  }
}

// ===== Универсальная модалка =====
const modal = document.getElementById('dateModal');
const closeModal = document.getElementById('closeModal');
const showReportBtn = document.getElementById('showReportBtn');
const periodReport = document.getElementById('periodReport');
const closeReport = document.getElementById('closeReport');

let currentReportType = null;

function openModal(type) {
  currentReportType = type;

  document.getElementById('agentField').style.display = 'none';
  document.getElementById('serviceField').style.display = 'none';

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  document.getElementById('endDate').value = today.toISOString().split('T')[0];
  document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];

  if (type === 'period') {
    document.getElementById('modalTitle').textContent = 'Продажи за период';
  } else if (type === 'agent') {
    document.getElementById('modalTitle').textContent = 'Выгрузка по агенту';
    document.getElementById('agentField').style.display = 'block';
    document.getElementById('filterAgent').value = '';
  } else if (type === 'service') {
    document.getElementById('modalTitle').textContent = 'Выгрузка по услугам';
    document.getElementById('serviceField').style.display = 'block';
    document.getElementById('filterService').value = '';
  }

  modal.style.display = 'block';
}

document.getElementById('salesByPeriodCard').addEventListener('click', () => openModal('period'));
document.getElementById('salesByAgentCard').addEventListener('click', () => openModal('agent'));
document.getElementById('salesByServiceCard').addEventListener('click', () => openModal('service'));

closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Показать отчёт
showReportBtn.addEventListener('click', async () => {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
    alert('Пожалуйста, выберите обе даты');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert('Дата начала не может быть позже даты окончания');
    return;
  }

  let url = `/api/sales?start_date=${startDate}&end_date=${endDate}`;
  let reportTitle = `Отчёт за период`;
  let totalLabel = 'продаж';

  if (currentReportType === 'agent') {
    const agent = document.getElementById('filterAgent').value;
    if (!agent) {
      alert('Пожалуйста, выберите агента');
      return;
    }
    url += `&agent=${encodeURIComponent(agent)}`;
    reportTitle = `Отчёт по агенту ${agent}`;
    totalLabel = `продаж агента ${agent}`;
  } else if (currentReportType === 'service') {
    const service = document.getElementById('filterService').value;
    if (!service) {
      alert('Пожалуйста, выберите услугу');
      return;
    }
    url += `&service=${encodeURIComponent(service)}`;
    reportTitle = `Отчёт по услуге ${service}`;
    totalLabel = `продаж услуги ${service}`;
  }

  try {
    const res = await fetch(url);
    const sales = await res.json();

    // Разворачиваем продажи по quantity
    const expandedSales = expandSales(sales);

    // Сортировка: сначала по дате, потом по агенту
    expandedSales.sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.agent.localeCompare(b.agent);
    });

    // Закрыть модалку
    modal.style.display = 'none';

    // Показать отчёт
    periodReport.style.display = 'block';
    document.getElementById('reportTitle').textContent = reportTitle;
    document.getElementById('periodDates').textContent = `${formatDate(startDate)} — ${formatDate(endDate)}`;
    document.getElementById('totalSalesCount').textContent = expandedSales.length;
    document.getElementById('totalLabel').textContent = totalLabel;

    // Отобразить продажи
    const salesList = document.getElementById('periodSalesList');
    if (expandedSales.length === 0) {
      salesList.innerHTML = '<div class="empty-state"><p>Нет продаж за выбранный период</p></div>';
    } else {
      salesList.innerHTML = expandedSales.map(sale => `
        <div class="sale-row-compact">
          <span class="sale-field sale-date">${formatDate(sale.date)}</span>
          <span class="sale-divider">•</span>
          <span class="sale-field sale-flight">Рейс ${sale.flight}</span>
          <span class="sale-divider">•</span>
          <span class="sale-field sale-service">${sale.service}</span>
          <span class="sale-divider">•</span>
          <span class="sale-field sale-quantity">× ${sale.quantity}</span>
          <span class="sale-divider">•</span>
          <span class="sale-field sale-agent">${sale.agent}</span>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Ошибка загрузки отчёта:', error);
    alert('Ошибка при загрузке отчёта');
  }
});

closeReport.addEventListener('click', () => {
  periodReport.style.display = 'none';
});

// ===== Загрузка всех продаж =====
async function loadAllSales() {
  try {
    const res = await fetch('/api/sales');
    const sales = await res.json();

    const container = document.getElementById('salesContainer');

    if (!sales.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Пока нет продаж</p>
          <a href="/" class="btn-primary">Добавить первую продажу →</a>
        </div>
      `;
      return;
    }

    // Разворачиваем и считаем общее количество
    const expandedSales = expandSales(sales);

    // Группировка по рейсам (используем оригинальные записи для группировки)
    const byFlight = {};
    sales.forEach(sale => {
      if (!byFlight[sale.flight]) {
        byFlight[sale.flight] = [];
      }
      byFlight[sale.flight].push(sale);
    });

    let html = '<div class="sales-list">';

    Object.entries(byFlight).forEach(([flight, items]) => {
      // Считаем количество для этого рейса (сумма quantity)
      const flightCount = items.reduce((sum, s) => sum + s.quantity, 0);

      html += `
        <div class="flight-group">
          <div class="flight-header">
            <span class="flight-number">Рейс ${flight}</span>
            <span class="flight-count">${flightCount} продаж</span>
          </div>
          <div class="flight-items">
      `;

      // Разворачиваем каждую запись по quantity
      items.forEach(sale => {
        for (let i = 0; i < sale.quantity; i++) {
          html += `
            <div class="sale-row-compact">
              <span class="sale-field sale-date">${formatDate(sale.date)}</span>
              <span class="sale-divider">•</span>
              <span class="sale-field sale-service">${sale.service}</span>
              <span class="sale-divider">•</span>
              <span class="sale-field sale-quantity">× 1</span>
              <span class="sale-divider">•</span>
              <span class="sale-field sale-agent">${sale.agent}</span>
            </div>
          `;
        }
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Ошибка загрузки продаж:', error);
  }
}

// ===== Очистка всех данных =====
document.getElementById('clearBtn').addEventListener('click', async () => {
  if (!confirm('️ Вы уверены, что хотите удалить ВСЕ продажи?\n\nЭто действие нельзя отменить!')) {
    return;
  }

  try {
    const res = await fetch('/api/sales', { method: 'DELETE' });
    if (res.ok) {
      loadStats();
      loadAllSales();
    } else {
      alert('Ошибка при удалении');
    }
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
});

// ===== Инициализация =====
loadStats();
loadAllSales();