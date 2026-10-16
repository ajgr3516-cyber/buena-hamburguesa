// CONFIGURATION
const SUPABASE_URL = "https://TU_PROYECTO.supabase.co"; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";     // Replace with your Supabase Anon Key
const WHATSAPP_NUMBER = "584120000000";                // Replace with business WhatsApp number

// Initialize Supabase Client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Cart State
let cart = [];

// Initialize Telegram WebApp SDK
const tg = window.Telegram ? window.Telegram.WebApp : null;

document.addEventListener("DOMContentLoaded", () => {
  if (tg) {
    tg.ready();
    tg.expand();
  }
  verifyUserAccess();
});

// Step 1: User Verification via Supabase
async function verifyUserAccess() {
  let telegramUser = tg ? tg.initDataUnsafe?.user : null;
  let telegramId = telegramUser ? telegramUser.id : null;

  // Fallback testing ID if accessed outside Telegram
  if (!telegramId) {
    console.warn("Acceso fuera de Telegram SDK. Usando ID de prueba opcional.");
    telegramId = 123456789; 
  }

  const userIdSpan = document.getElementById("user-tg-id");
  if (userIdSpan) userIdSpan.innerText = telegramId;

  try {
    if (!supabase) throw new Error("Supabase client no configurado.");

    // Query 'usuarios_autorizados' table
    const { data, error } = await supabase
      .from('usuarios_autorizados')
      .select('telegram_id')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !data) {
      showUnauthorized();
    } else {
      showAppContent();
    }
  } catch (err) {
    console.warn("Fallo de verificación de Supabase:", err.message);
    // Allow access or block access depending on strictness
    showAppContent(); 
  }
}

function showUnauthorized() {
  document.getElementById("unauthorized-screen").classList.remove("hidden");
  document.getElementById("app-content").classList.add("hidden");
}

function showAppContent() {
  document.getElementById("unauthorized-screen").classList.add("hidden");
  document.getElementById("app-content").classList.remove("hidden");
}

// Navigation Tabs
function switchPage(pageNumber) {
  const pages = document.querySelectorAll('.page-content');
  const buttons = document.querySelectorAll('.nav-btn');

  pages.forEach(p => p.classList.remove('active'));
  buttons.forEach(b => b.classList.remove('active'));

  const selectedPage = document.getElementById(`page-${pageNumber}`);
  if (selectedPage) selectedPage.classList.add('active');

  if (buttons[pageNumber - 1]) {
    buttons[pageNumber - 1].classList.add('active');
  }

  if (pageNumber === 6) {
    renderCart();
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Shopping Cart Functions
function addToCart(name, price, img) {
  const existingItem = cart.find(item => item.name === name);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ name, price, img, qty: 1 });
  }
  updateCartBadge();
  if (tg) tg.HapticFeedback.impactOccurred('light');
}

function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  badge.innerText = totalItems;
}

function updateQuantity(index, change) {
  cart[index].qty += change;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  updateCartBadge();
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById("cart-items");
  const subtotalElem = document.getElementById("cart-subtotal");
  const totalElem = document.getElementById("cart-total");

  if (cart.length === 0) {
    cartList.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">Tu carrito está vacío 🛒</p>`;
    subtotalElem.innerText = "$0.00";
    totalElem.innerText = "$0.00";
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach((item, idx) => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    html += `
      <div class="cart-item">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p>$${item.price.toFixed(2)} x ${item.qty} = $${itemTotal.toFixed(2)}</p>
        </div>
        <div class="cart-controls">
          <button onclick="updateQuantity(${idx}, -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="updateQuantity(${idx}, 1)">+</button>
        </div>
      </div>
    `;
  });

  cartList.innerHTML = html;
  subtotalElem.innerText = `$${total.toFixed(2)}`;
  totalElem.innerText = `$${total.toFixed(2)}`;
}

function toggleDeliveryAddress() {
  const option = document.getElementById("delivery-option").value;
  const addressGroup = document.getElementById("address-group");
  const addressInput = document.getElementById("client-address");

  if (option === "Pick-up") {
    addressGroup.style.display = "none";
    addressInput.removeAttribute("required");
  } else {
    addressGroup.style.display = "flex";
    addressInput.setAttribute("required", "true");
  }
}

// Dispatch Order via WhatsApp
function submitOrder(e) {
  e.preventDefault();

  if (cart.length === 0) {
    alert("Agrega productos al carrito antes de confirmar tu pedido.");
    return;
  }

  const name = document.getElementById("client-name").value;
  const deliveryOption = document.getElementById("delivery-option").value;
  const address = document.getElementById("client-address").value;
  const paymentMethod = document.getElementById("payment-method").value;
  const notes = document.getElementById("order-notes").value;

  let total = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  // Build Text Message
  let msg = `🍔 *NUEVO PEDIDO - BUENA HAMBURGUESA* 🍔\n\n`;
  msg += `👤 *Cliente:* ${name}\n`;
  msg += `🛵 *Tipo de Entrega:* ${deliveryOption}\n`;
  if (deliveryOption === "Delivery") {
    msg += `📍 *Dirección:* ${address}\n`;
  }
  msg += `💳 *Método de Pago:* ${paymentMethod}\n`;
  if (notes) msg += `📝 *Notas:* ${notes}\n`;
  msg += `\n📋 *DETALLE DEL PEDIDO:*\n`;

  cart.forEach(item => {
    msg += `• ${item.qty}x ${item.name} - $${(item.price * item.qty).toFixed(2)}\n`;
  });

  msg += `\n💰 *TOTAL A PAGAR:* $${total.toFixed(2)}`;

  const encodedMsg = encodeURIComponent(msg);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMsg}`;

  window.open(whatsappUrl, '_blank');
}
