import BLOG from './data/blog.json';
import { $, img, esc, WHATSAPP } from './util.js';

export { BLOG };
export const BLOG_BY = Object.fromEntries(BLOG.map((a) => [a.handle, a]));

const fmtDate = (iso) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
const cover = (a, w) => (a.image ? img(a.image, w) : '/hwc-logo.png');

export function postCard(a, { big = false } = {}) {
  return `<a class="post ${big ? 'post-big' : ''}" href="/blog/${a.handle}">
    <img src="${cover(a, big ? 1400 : 700)}" alt="${esc(a.imageAlt || a.title)}" loading="lazy" />
    <div>
      <p class="post-meta">${fmtDate(a.published)} · ${a.minutes} dk okuma</p>
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.summary).slice(0, big ? 260 : 150)}${a.summary.length > (big ? 260 : 150) ? '…' : ''}</p>
    </div>
  </a>`;
}

// Ana sayfadaki "Karar vermenize yardımcı olalım" (orijinaldeki 3 yazı)
const HOME_PICKS = ['ahsap-yemek-masasi-secimi', 'calisma-masasi-alirken-dikkat-edilmesi-gerekenler', 'masif-ahsap-thermowood-firinlanmis-agac-farklari'];
export function renderHomePosts() {
  const list = HOME_PICKS.map((h) => BLOG_BY[h]).filter(Boolean);
  $('#homePosts').innerHTML = list.map((a) => postCard(a)).join('');
}

export function renderBlogList() {
  const [first, ...rest] = BLOG;
  $('#blogList').innerHTML = `
    <nav class="crumbs" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span>/</span><span>Blog</span></nav>
    <div class="section-head">
      <p class="kicker">Rehber</p>
      <h1>Ahşap, masa ve atölye üzerine</h1>
      <p>Masa seçimi, ahşap türleri, yüzey bakımı ve atölyeden notlar. ${BLOG.length} yazı.</p>
    </div>
    ${first ? postCard(first, { big: true }) : ''}
    <div class="posts">${rest.map((a) => postCard(a)).join('')}</div>`;
  document.title = 'Blog — Rehber | HWC';
  return 'Blog';
}

export function renderArticle(handle) {
  const i = BLOG.findIndex((a) => a.handle === handle);
  const a = BLOG[i];
  if (!a) {
    $('#article').innerHTML = `<div class="notfound"><h1>Yazı bulunamadı</h1><a class="btn btn-dark" href="/blog">Tüm yazılar</a></div>`;
    return 'Yazı bulunamadı';
  }
  const prev = BLOG[i + 1];
  const next = BLOG[i - 1];
  const others = BLOG.filter((x) => x !== a).slice(0, 3);
  const share = `${WHATSAPP.replace('/905438985384', '')}/?text=${encodeURIComponent(`${a.title} — ${location.origin}/blog/${a.handle}`)}`;
  $('#article').innerHTML = `
    <nav class="crumbs" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span>/</span><a href="/blog">Blog</a><span>/</span><span>${esc(a.title)}</span></nav>
    <header class="article-head">
      <p class="post-meta">${fmtDate(a.published)} · ${a.minutes} dk okuma · ${esc(a.author)}</p>
      <h1>${esc(a.title)}</h1>
      <p class="lead">${esc(a.summary)}</p>
    </header>
    ${a.image ? `<figure class="article-cover"><img src="${img(a.image, 1800)}" alt="${esc(a.imageAlt || a.title)}" /></figure>` : ''}
    <div class="article-wrap">
      <article class="prose">${a.html}</article>
      <aside class="article-side">
        <div class="side-card">
          <h4>Masanızı yerinde görün</h4>
          <p>Koleksiyondaki masaları 3D showroom'da gezip desen ve ölçü seçebilirsiniz.</p>
          <button class="btn btn-dark" data-action="enter">3D Showroom'u gez</button>
          <a class="btn btn-outline" href="/koleksiyon/tum-masalar">Tüm ürünler</a>
        </div>
        <a class="share" href="${share}" target="_blank" rel="noopener">WhatsApp'ta paylaş</a>
      </aside>
    </div>
    <nav class="article-nav">
      ${prev ? `<a href="/blog/${prev.handle}"><span>← Önceki yazı</span>${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="/blog/${next.handle}"><span>Sonraki yazı →</span>${esc(next.title)}</a>` : '<span></span>'}
    </nav>
    <section class="related"><h2>Diğer yazılar</h2><div class="posts">${others.map((x) => postCard(x)).join('')}</div></section>`;
  document.title = `${a.title} | HWC Blog`;
  return a.title;
}
