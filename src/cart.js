// Basit sepet: seçimler tarayıcıda tutulur, ödeme Shopify'ın kendi ödeme sayfasında
// "cart permalink" (/cart/VARYANT:ADET,...) ile tamamlanır.
import { PRODUCTS, STORE, formatTRY } from './catalog.js';
import { $, esc, img, variantTitle } from './util.js';

const KEY = 'hwc-cart-v1';
let items = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => lookup(i).v) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* gizli mod vb. — sepet yine de bu oturumda çalışır */
  }
  render();
}

function lookup(i) {
  const p = PRODUCTS[i.handle];
  const v = p && p.variants.find((x) => x[0] === i.id);
  return { p, v };
}

export const checkoutUrl = (list = items) => `${STORE}/cart/${list.map((i) => `${i.id}:${i.qty}`).join(',')}`;

export function addToCart(handle, variant, qty = 1) {
  if (!variant || !variant[6]) return;
  const ex = items.find((i) => i.id === variant[0]);
  if (ex) ex.qty = Math.min(20, ex.qty + qty);
  else items.push({ id: variant[0], handle, qty });
  persist();
  openCart();
}

export function openCart() {
  document.body.classList.add('cart-open');
  $('#cart').setAttribute('aria-hidden', 'false');
}

export function closeCart() {
  document.body.classList.remove('cart-open');
  $('#cart').setAttribute('aria-hidden', 'true');
}

export function render() {
  const count = items.reduce((s, i) => s + i.qty, 0);
  const badge = $('#cartCount');
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  const list = $('#cartItems');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = `<div class="cart-empty"><p>Sepetiniz boş.</p><a class="btn btn-outline" href="/koleksiyon/tum-masalar" data-cart-close>Ürünlere göz atın</a></div>`;
  } else {
    list.innerHTML = items
      .map((i) => {
        const { p, v } = lookup(i);
        return `<div class="cart-item" data-id="${i.id}">
          <a href="/urun/${p.handle}" data-cart-close><img src="${img(p.images[0], 200)}" alt="" /></a>
          <div>
            <a class="ci-title" href="/urun/${p.handle}" data-cart-close>${esc(p.title)}</a>
            <p class="ci-var">${esc(variantTitle(v))}</p>
            <div class="ci-row">
              <div class="qty"><button data-q="-1" aria-label="Azalt">−</button><span>${i.qty}</span><button data-q="1" aria-label="Artır">+</button></div>
              <strong>${formatTRY(v[4] * i.qty)}</strong>
            </div>
            <button class="ci-remove" data-remove>Kaldır</button>
          </div>
        </div>`;
      })
      .join('');
  }
  const total = items.reduce((s, i) => s + lookup(i).v[4] * i.qty, 0);
  $('#cartTotal').textContent = formatTRY(total);
  const co = $('#cartCheckout');
  co.href = items.length ? checkoutUrl() : '#';
  co.classList.toggle('disabled', !items.length);
}

export function initCart() {
  render();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]')) {
      e.preventDefault();
      openCart();
    }
    if (e.target.closest('[data-cart-close]') || e.target.id === 'cartScrim') closeCart();
    const row = e.target.closest('.cart-item');
    if (!row) return;
    const it = items.find((i) => String(i.id) === row.dataset.id);
    if (!it) return;
    const q = e.target.closest('[data-q]');
    if (q) {
      it.qty = Math.max(1, Math.min(20, it.qty + +q.dataset.q));
      persist();
    }
    if (e.target.closest('[data-remove]')) {
      items = items.filter((x) => x !== it);
      persist();
    }
  });
  $('#cartCheckout').addEventListener('click', (e) => {
    if (!items.length) e.preventDefault();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('cart-open')) closeCart();
  });
  addEventListener('storage', (e) => {
    if (e.key === KEY) {
      items = load();
      render();
    }
  });
}
