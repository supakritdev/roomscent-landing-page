/**
 * Room Scent - Main Shared Script
 * Handles Product Catalog, Order Form Submission, and Admin CSV Dashboard
 */

const CONFIG = {
  PRODUCTS_URL: 'products.json',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyCn0MIkf_SIldnKOdD4UCwkcYv8LEitV9eruAcVZG7NQYNtn_3D2X6aHO2GhFJW9FU/exec',
  CSV_URL: '[CSV_URL]'
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Product Page Initialization
  if (document.getElementById('product-list')) {
    initProductPage();
  }

  // 2. Order Page Initialization
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  // 3. Admin Page Initialization
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

/* ==========================================================================
   1. PRODUCT PAGE (product.html)
   ========================================================================== */
let allProducts = [];

async function initProductPage() {
  const productListEl = document.getElementById('product-list');
  const filterBarEl = document.getElementById('filter-bar');

  try {
    const response = await fetch(CONFIG.PRODUCTS_URL);
    if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลสินค้าได้');
    allProducts = await response.json();

    // Read ?mood=xxx from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialMood = (urlParams.get('mood') || 'all').toLowerCase();
    const validMoods = ['all', 'fresh', 'relax', 'focus', 'romance'];
    const activeMood = validMoods.includes(initialMood) ? initialMood : 'all';

    renderFilterButtons(filterBarEl, activeMood);
    filterAndRenderProducts(activeMood, productListEl);
  } catch (error) {
    console.error('Error loading products:', error);
    productListEl.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">ขออภัย ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้</p>`;
  }
}

function renderFilterButtons(filterBarEl, activeMood) {
  if (!filterBarEl) return;

  const moods = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'relax', label: 'Relax' },
    { key: 'focus', label: 'Focus' },
    { key: 'romance', label: 'Romance' }
  ];

  filterBarEl.innerHTML = moods
    .map(m => {
      const isActive = m.key === activeMood ? 'active' : '';
      const dotHtml = m.key !== 'all' ? `<span class="mood-dot" data-mood="${m.key}"></span>` : '';
      return `
        <button type="button" class="filter-btn ${isActive}" data-filter="${m.key}">
          ${dotHtml}
          <span>${m.label}</span>
        </button>
      `;
    })
    .join('');

  // Bind click events to filter buttons
  filterBarEl.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedMood = btn.getAttribute('data-filter');

      // Update active state
      filterBarEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update URL parameter without reloading page
      const newUrl = new URL(window.location);
      if (selectedMood === 'all') {
        newUrl.searchParams.delete('mood');
      } else {
        newUrl.searchParams.set('mood', selectedMood);
      }
      window.history.replaceState({}, '', newUrl);

      // Render filtered list
      const productListEl = document.getElementById('product-list');
      filterAndRenderProducts(selectedMood, productListEl);
    });
  });
}

function filterAndRenderProducts(mood, container) {
  const filtered = mood === 'all'
    ? allProducts
    : allProducts.filter(p => p.mood.toLowerCase() === mood);

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">ไม่พบสินค้าในหมวดหมู่นี้</p>`;
    return;
  }

  container.innerHTML = filtered
    .map(product => {
      const orderUrl = `order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}`;
      const moodLabel = product.mood.charAt(0).toUpperCase() + product.mood.slice(1);

      return `
        <article class="product-card">
          <div class="product-image-wrap">
            <span class="product-meta-tag">
              <span class="mood-dot" data-mood="${product.mood}"></span>
              ${moodLabel}
            </span>
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
          </div>
          <div class="product-body">
            <h3 class="product-title">${escapeHtml(product.name)}</h3>
            <div class="mood-line mood-${product.mood}"></div>
            <p class="product-desc" style="margin-bottom: 0.75rem;">ขนาด: ${escapeHtml(product.size)}</p>
            <div class="product-footer">
              <span class="product-price">฿${Number(product.price).toLocaleString()}</span>
              <a href="${orderUrl}" class="btn btn-sm">สั่งซื้อ</a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

/* ==========================================================================
   2. ORDER PAGE (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // Read item & price from URL parameters and auto-fill immediately
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  if (itemParam && itemsInput) {
    itemsInput.value = itemParam;
  }
  if (priceParam && totalInput) {
    totalInput.value = priceParam;
  }

  // Handle form submission
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังส่งคำสั่งซื้อ...';
    }

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch('https://script.google.com/macros/s/AKfycbyCn0MIkf_SIldnKOdD4UCwkcYv8LEitV9eruAcVZG7NQYNtn_3D2X6aHO2GhFJW9FU/exec', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  });
}

/* ==========================================================================
   3. ADMIN PAGE (admin.html)
   ========================================================================== */
async function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  try {
    const response = await fetch(CONFIG.CSV_URL);
    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูล CSV ได้');

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // Expect row[0] to be header: [วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ]
    if (rows.length <= 1) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">ยังไม่มีรายการสั่งซื้อ</td></tr>`;
      return;
    }

    // Remove header row, filter out empty lines, and reverse to show latest orders first
    const dataRows = rows
      .slice(1)
      .filter(row => row.some(cell => cell.trim() !== ''))
      .reverse();

    tbody.innerHTML = dataRows
      .map(row => {
        const timestamp = escapeHtml(row[0] || '-');
        const customerName = escapeHtml(row[1] || '-');
        const contact = escapeHtml(row[2] || '-');
        const items = escapeHtml(row[3] || '-');
        const total = row[4] ? `฿${Number(row[4].replace(/,/g, '')).toLocaleString()}` : '-';
        const note = escapeHtml(row[5] || '-');

        return `
          <tr>
            <td>${timestamp}</td>
            <td>${customerName}</td>
            <td>${contact}</td>
            <td>${items}</td>
            <td>${escapeHtml(total)}</td>
            <td>${note}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading admin orders:', error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ</td></tr>`;
  }
}

/**
 * Custom RFC-4180 Compliant CSV Parser (No external libraries)
 * Properly handles quoted strings, commas inside quotes, escaped quotes (""), and newlines.
 */
function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  // Normalize line endings (\r\n -> \n)
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote inside quoted field
        currentCell += '"';
        i++;
      } else if (char === '"') {
        // Closing quote
        insideQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        // Opening quote
        insideQuotes = true;
      } else if (char === ',') {
        // End of cell
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        // End of row
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Push last cell/row if file doesn't end with a newline
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

/* ==========================================================================
   UTILITY HELPERS
   ========================================================================== */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}