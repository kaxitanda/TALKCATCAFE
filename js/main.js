/* ============================================
   main.js
   肉球トレイル演出／ナビゲーション開閉／
   Intersection Observer によるスクロール出現演出
   ============================================ */

/* ---------- 設定：次回開催日（開催のたびにここだけを書き換える） ----------
   'YYYY-MM-DD' の形式で書く（例：'2026-11-15'）。
   全ページのヘッダーの「次回開催」バッジに、曜日付きで自動表示される（ブロック10）。
   ・開催日を過ぎると、自動で「次回開催：未定」の表示に切り替わる（開催当日までは日付を表示）
   ・次回が未定の場合は '' にすると、「次回開催：未定」と表示される */
const NEXT_EVENT_DATE = '';

 /* ---------- 1. 肉球トレイル（カーソルの足跡演出） ----------
    マウスが一定距離（PAW_STEP_DISTANCE）動くごとに、現在位置へ
    肉球（.paw-print）を1つ生成する。進行方向をもとに向き（rotate）
    を計算し、進行方向に対して垂直な方向へ左右交互にずらすことで、
    歩いた足跡のように見せる。生成した肉球は、CSS側のフェード
    アニメーション（pawFade）終了時（animationendイベント）に
    自身をDOMから取り除く。
    タッチデバイス・OS側で「視差効果を減らす」設定をしている
    ユーザーには、演出自体を発生させない。 */
 (() => {
   const trail = document.querySelector('.paw-trail');
   const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

   if (!trail || isTouchDevice || prefersReducedMotion) return;

   const PAW_STEP_DISTANCE = 120; // この距離(px)動くたびに次の足跡を生成する
   const PAW_SIDE_OFFSET = 40;   // 進行方向に対して垂直に、左右へずらす距離(px)
   const PAW_LIFETIME = 1300;    // animationendが発火しなかった場合の保険用削除タイマー(ms)

   let lastX = null;
   let lastY = null;
   let isLeftStep = true;

   window.addEventListener('mousemove', (event) => {
     const { clientX: x, clientY: y } = event;

     if (lastX === null) {
       lastX = x;
       lastY = y;
       return;
     }

     const dx = x - lastX;
     const dy = y - lastY;
     const distance = Math.hypot(dx, dy);

     if (distance < PAW_STEP_DISTANCE) return;

     // 進行方向の角度。肉球のSVGは「上向き」に描いているため、
     // 進行方向へ向けるには90度分を足して補正する。
     const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

     // 進行方向に対して垂直な向きへ、左右交互にオフセットする
     const perpendicularRad = (angleDeg - 90) * (Math.PI / 180);
     const sideSign = isLeftStep ? -1 : 1;
     const offsetX = Math.cos(perpendicularRad) * PAW_SIDE_OFFSET * sideSign;
     const offsetY = Math.sin(perpendicularRad) * PAW_SIDE_OFFSET * sideSign;
     isLeftStep = !isLeftStep;

     const paw = document.createElement('div');
     paw.className = 'paw-print';
     paw.style.left = `${x + offsetX}px`;
     paw.style.top = `${y + offsetY}px`;
     paw.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
     paw.innerHTML = `
       <svg class="paw-print__icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
         <ellipse cx="50" cy="68" rx="24" ry="20" fill="currentColor"/>
         <ellipse cx="20" cy="38" rx="11" ry="14" fill="currentColor"/>
         <ellipse cx="38" cy="15" rx="10" ry="13" fill="currentColor"/>
         <ellipse cx="62" cy="15" rx="10" ry="13" fill="currentColor"/>
         <ellipse cx="80" cy="38" rx="11" ry="14" fill="currentColor"/>
       </svg>
     `;

    const icon = paw.querySelector('.paw-print__icon');
    icon.addEventListener('animationend', () => paw.remove());
    setTimeout(() => paw.remove(), PAW_LIFETIME);
     trail.appendChild(paw);
     lastX = x;
     lastY = y;
   });
 })();

/* ---------- 2. モバイルナビゲーションの開閉 ----------
   ボタンクリックで.site-nav__listに.is-openを付け外しする。
   見た目（フルスクリーン表示・アニメーション）はすでに
   responsive.css側で定義済みのため、ここでは状態管理と
   aria-expanded属性の更新のみを行う。 */
(() => {
  const navToggle = document.querySelector('.site-nav__toggle');
  const navList = document.querySelector('.site-nav__list');

  if (!navToggle || !navList) return;

  navToggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // メニュー内のリンクを押したら、メニューを自動的に閉じる
  navList.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navList.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ---------- 3. スクロール出現演出 ----------
   .reveal クラスが付いた要素が画面内に入ったタイミングで
   .is-visible を付与する。実際のフェードイン表現は
   components.css側の .reveal / .reveal.is-visible が担当する。 */
(() => {
  const revealTargets = document.querySelectorAll('.reveal');

  if (revealTargets.length === 0) return;

  // 古いブラウザ等でIntersectionObserverが使えない場合は、
  // 演出を諦めて最初から表示しておく（体験を損なわないためのフォールバック）
  if (!('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        // 一度表示したら、その要素の監視は終了する
        // （スクロールで再び上に隠れても消えないようにするため）
        observer.unobserve(entry.target);
      });
    },
    {
      // 要素の一部でも画面に入ったら表示する。
      // 割合（例：0.2）で判定すると、スマートフォンで1列になった
      // キャスト一覧など、画面の何倍も高い要素は条件を満たせず
      // 透明のまま残ってしまうため、0とする。
      threshold: 0,
      rootMargin: '0px 0px -10% 0px',
    }
  );

  revealTargets.forEach((target) => observer.observe(target));
})();

 /* ---------- 5. ライトボックス（画像拡大表示） ----------
    [data-lightbox-trigger]を持つ要素がクリックされたら、
    [data-lightbox]要素（拡大表示エリア）にsrc/altを差し込んで表示する。
    ページ内に両方の要素が存在する場合にのみ動作する汎用処理のため、
    店舗紹介・メニュー等、複数ページで共通して使い回せる。 */
 (() => {
   const lightbox = document.querySelector('[data-lightbox]');
   const triggers = document.querySelectorAll('[data-lightbox-trigger]');

   if (!lightbox || triggers.length === 0) return;

   const lightboxImage = lightbox.querySelector('[data-lightbox-image]');
   const closeElements = lightbox.querySelectorAll('[data-lightbox-close]');
   const closeButton = lightbox.querySelector('.lightbox__close');
   let lastFocusedTrigger = null;

   const handleLightboxTransitionEnd = (event) => {
     if (event.target !== lightbox) return;
     lightbox.hidden = true;
     lightboxImage.src = '';
     lightbox.removeEventListener('transitionend', handleLightboxTransitionEnd);
   };

   const openLightbox = (trigger) => {
     lightboxImage.src = trigger.dataset.lightboxSrc;
     lightboxImage.alt = trigger.dataset.lightboxAlt || '';
     lastFocusedTrigger = trigger;
     lightbox.hidden = false;
     requestAnimationFrame(() => {
       lightbox.classList.add('is-open');
     });
     closeButton.focus();
   };

   const closeLightbox = () => {
     lightbox.classList.remove('is-open');
     lightbox.addEventListener('transitionend', handleLightboxTransitionEnd);
     if (lastFocusedTrigger) lastFocusedTrigger.focus();
   };

   triggers.forEach((trigger) => {
     trigger.addEventListener('click', () => openLightbox(trigger));
   });

   closeElements.forEach((el) => {
     el.addEventListener('click', closeLightbox);
   });

   // Escapeキーでも閉じられるようにする（開いている時のみ判定）
   document.addEventListener('keydown', (event) => {
     if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
   });
 })();

 /* ---------- 6. キャストページ：表示切り替え（店員／裏方） ----------
   [data-cast-filter]内のボタンがクリックされたら、
   [data-cast-filter-list]内の項目のうち、data-role属性が
   選択中のfilterと一致しないものに.is-hiddenを付与する。
   メニューのDAY/NIGHTと異なり「共通」の区分はないため、
   完全一致のみで判定する。 */
 (() => {
   const filterButtons = document.querySelectorAll('[data-cast-filter] .filter-toggle__btn');
   const filterList = document.querySelector('[data-cast-filter-list]');

   if (filterButtons.length === 0 || !filterList) return;

   const items = filterList.querySelectorAll('.cast-gallery__item');

   const applyFilter = (filter) => {
     items.forEach((item) => {
       const shouldShow = item.dataset.role === filter;
       item.classList.toggle('is-hidden', !shouldShow);
     });
   };

   filterButtons.forEach((button) => {
     button.addEventListener('click', () => {
       const filter = button.dataset.filter;
       filterButtons.forEach((btn) => btn.classList.remove('is-active'));
       button.classList.add('is-active');
       applyFilter(filter);
     });
   });

   const initialButton = document.querySelector('[data-cast-filter] .filter-toggle__btn.is-active') || filterButtons[0];
   applyFilter(initialButton.dataset.filter);
 })();

 /* ---------- 7. キャストプロフィールモーダル ----------
   [data-cast-trigger]がクリックされたら、[data-cast-modal]内に
   写真・名前・役職・プロフィール文を差し込んで表示する。
   開閉時のフェード演出は.lightboxと同じ考え方（is-open付与を
   次フレームへずらす／transitionend完了後にhiddenへ戻す）を
   踏襲しているが、対象要素・差し込むデータが異なるため
   独立した別処理としている。 */
 (() => {
   const modal = document.querySelector('[data-cast-modal]');
   const triggers = document.querySelectorAll('[data-cast-trigger]');

   if (!modal || triggers.length === 0) return;

   const modalImage = modal.querySelector('[data-cast-modal-image]');
   const modalName = modal.querySelector('[data-cast-modal-name]');
   const modalRole = modal.querySelector('[data-cast-modal-role]');
   const modalBio = modal.querySelector('[data-cast-modal-bio]');
   const closeElements = modal.querySelectorAll('[data-cast-modal-close]');
   const closeButton = modal.querySelector('.cast-modal__close');
   let lastFocusedTrigger = null;

   const handleModalTransitionEnd = (event) => {
     if (event.target !== modal) return;
     modal.hidden = true;
     modalImage.src = '';
     modal.removeEventListener('transitionend', handleModalTransitionEnd);
   };

   const openModal = (trigger) => {
     modalImage.src = trigger.dataset.castSrc;
     modalImage.alt = trigger.dataset.castName || '';
     modalName.textContent = trigger.dataset.castName || '';
     modalRole.textContent = trigger.dataset.castRole || '';
     modalBio.textContent = trigger.dataset.castBio || '';
     lastFocusedTrigger = trigger;
     modal.hidden = false;
     requestAnimationFrame(() => {
       modal.classList.add('is-open');
     });
     closeButton.focus();
   };

   const closeModal = () => {
     modal.classList.remove('is-open');
     modal.addEventListener('transitionend', handleModalTransitionEnd);
     if (lastFocusedTrigger) lastFocusedTrigger.focus();
   };

   triggers.forEach((trigger) => {
     trigger.addEventListener('click', () => openModal(trigger));
   });

   closeElements.forEach((el) => {
     el.addEventListener('click', closeModal);
   });

   document.addEventListener('keydown', (event) => {
     if (event.key === 'Escape' && !modal.hidden) closeModal();
   });
})();

 /* ---------- 8. 矢印付きカルーセル（メニュー／独自システム） ----------
    [data-carousel]要素ごとに独立したスライド管理を行う。
    スライドが1枚以下のカテゴリーでは矢印自体を隠し、
    クリック処理も登録しない（切り替える意味がないため）。
    表示中以外のスライドにはinert属性を付与し、画面外のスライド内の
    要素（YouTubeのiframe等）へTabキー・読み上げで到達しないようにする。
    また、スライドを離れる際は、そのスライド内のiframeのsrcを
    設定し直して読み込み直し、動画の再生を止める（先頭に戻る）。 */
 (() => {
   const carousels = document.querySelectorAll('[data-carousel]');

   if (carousels.length === 0) return;

   carousels.forEach((carousel) => {
     const track = carousel.querySelector('[data-carousel-track]');
     const slides = track ? Array.from(track.children) : [];
     const prevButton = carousel.querySelector('[data-carousel-prev]');
     const nextButton = carousel.querySelector('[data-carousel-next]');

     if (slides.length <= 1) {
       if (prevButton) prevButton.hidden = true;
       if (nextButton) nextButton.hidden = true;
       return;
     }

     let currentIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
     if (currentIndex === -1) currentIndex = 0;

   const updateTrackPosition = () => {
     track.style.transform = `translateX(-${currentIndex * 100}%)`;
   };

     // 表示中のスライドのみ操作可能にし、それ以外はinertで無効化する
     const updateInert = () => {
       slides.forEach((slide, index) => {
         slide.inert = index !== currentIndex;
       });
     };

     // 指定したスライド内の動画（iframe）を読み込み直して再生を止める
     const stopVideos = (slide) => {
       slide.querySelectorAll('iframe').forEach((iframe) => {
         iframe.setAttribute('src', iframe.getAttribute('src'));
       });
     };

     updateTrackPosition();
     updateInert();

     const showSlide = (nextIndex) => {
       stopVideos(slides[currentIndex]);
       slides[currentIndex].classList.remove('is-active');
       currentIndex = nextIndex;
       slides[currentIndex].classList.add('is-active');
       updateTrackPosition();
       updateInert();
     };

     prevButton.addEventListener('click', () => {
       showSlide((currentIndex - 1 + slides.length) % slides.length);
     });

     nextButton.addEventListener('click', () => {
       showSlide((currentIndex + 1) % slides.length);
     });
   });
})();
 /* ---------- 9. ヘッダーの表示状態（透明／通常／非表示） ----------
    スクロール位置と方向に応じて、.site-headerに状態クラスを付け外しする。
    見た目はCSS側が担当する（layout.css／components.css／responsive.css）。
    ・ヘッダーの下端がヒーローの内側にある間：.is-transparent（透明）
    ・ヒーローを過ぎた後：通常表示
    ・ヒーロー下端からHIDE_DISTANCEを超えて下へスクロール：.is-hidden（非表示）
    ・上方向へのスクロールを検知：.is-hiddenを外して再表示
    スマートフォンでメニューを開いている間は、透明・非表示のどちらにもしない
    （メニューの背景に合わせた通常配色で、閉じるボタンを常に表示させるため）。
    .heroが存在しないページでは透明状態を使わず、ページ最上部を基準に判定する。 */
 (() => {
   const header = document.querySelector('.site-header');

   if (!header) return;

   const hero = document.querySelector('.hero');
   const navList = header.querySelector('.site-nav__list');
   const navToggle = header.querySelector('.site-nav__toggle');

   const HIDE_DISTANCE = 1080;  // ヒーロー下端を過ぎてから、この距離(px)を超えて下へスクロールすると非表示にする
   const SCROLL_TOLERANCE = 5;  // この値(px)以下の微小なスクロールは、方向の判定に使わない

   let lastY = window.scrollY;
   let isTicking = false;

   const update = () => {
     isTicking = false;

     const y = window.scrollY;
     // ヒーロー下端の、ページ先頭からの位置（ヒーローがなければ0）
     const heroBottom = hero ? hero.getBoundingClientRect().bottom + y : 0;
     // ヘッダー下端の、ページ先頭からの位置
     const headerBottom = y + header.offsetHeight;
     const isMenuOpen = Boolean(navList && navList.classList.contains('is-open'));
     const isOverHero = Boolean(hero) && headerBottom < heroBottom;

     header.classList.toggle('is-transparent', isOverHero && !isMenuOpen);

     // ヒーロー上・メニュー表示中は、方向にかかわらず常に表示する
     if (isOverHero || isMenuOpen) {
       header.classList.remove('is-hidden');
       lastY = y;
       return;
     }

     const delta = y - lastY;

     // 微小な揺れは無視する（lastYを更新しないことで、小さな移動を累積して判定する）
     if (Math.abs(delta) <= SCROLL_TOLERANCE) return;

     if (delta > 0 && headerBottom > heroBottom + HIDE_DISTANCE) {
       header.classList.add('is-hidden');
     } else if (delta < 0) {
       header.classList.remove('is-hidden');
     }

     lastY = y;
   };

   // スクロール・リサイズのたびに処理を走らせると重くなるため、
   // 描画1回につき1度だけ判定する（requestAnimationFrameで間引く）
   const requestUpdate = () => {
     if (isTicking) return;
     isTicking = true;
     requestAnimationFrame(update);
   };

   window.addEventListener('scroll', requestUpdate, { passive: true });
   window.addEventListener('resize', requestUpdate);

   // メニューの開閉（ブロック2）に合わせて状態を更新する。
   // ブロック2の処理が先に登録されているため、こちらが動く時点で
   // .is-openの付け外しは既に反映されている。
   if (navToggle) navToggle.addEventListener('click', requestUpdate);
   if (navList) {
     navList.querySelectorAll('a').forEach((link) => {
       link.addEventListener('click', requestUpdate);
     });
   }

   // 読み込み直後（途中位置での再読み込みを含む）の状態を反映する
   update();
 })();

 /* ---------- 10. 次回開催バッジ ----------
    ファイル先頭の NEXT_EVENT_DATE をもとに、[data-next-event] を付けた
    バッジへ「次回開催：11月1日（日）」の形で日付を書き込む。
    曜日は日付から自動で計算する。
    日付が空の場合・開催日を過ぎている場合は「次回開催：未定」と表示する。
    形式の誤りの場合は、バッジを非表示にする
    （.site-header__badge はdisplayを指定していないため、hidden属性で消える）。
    JavaScriptが無効な環境では、HTMLに書いた予備の文言がそのまま表示される。 */
 (() => {
   const badges = document.querySelectorAll('[data-next-event]');

   if (badges.length === 0) return;

   const hideBadges = () => badges.forEach((badge) => { badge.hidden = true; });

   const showUndecided = () => badges.forEach((badge) => { badge.textContent = '次回開催：未定'; });

   // 次回が未定（空欄）の場合
   if (NEXT_EVENT_DATE.trim() === '') {
     showUndecided();
     return;
   }

   const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(NEXT_EVENT_DATE);
   if (!match) {
     hideBadges();
     return;
   }

   const year = Number(match[1]);
   const month = Number(match[2]);
   const day = Number(match[3]);
   const eventDate = new Date(year, month - 1, day);

   // 今日の0時と比べ、開催日を過ぎていれば「未定」と表示する（当日は日付を表示する）
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   if (eventDate < today) {
     showUndecided();
     return;
   }

   const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
   const label = `${month}月${day}日（${WEEKDAYS[eventDate.getDay()]}）`;

   badges.forEach((badge) => {
     badge.textContent = '次回開催：';
     const time = document.createElement('time');
     time.dateTime = NEXT_EVENT_DATE;
     time.textContent = label;
     badge.appendChild(time);
   });
 })();
