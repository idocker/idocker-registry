/* ==========================================================================
   iDocker Registry — 产品站交互
   零构建、零依赖的原生 JS：语言切换 / 主题切换 / 复制命令 / 导航。
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * 站点常量
   * ------------------------------------------------------------------- */

  // 控制台地址。README 中 Docker 登录使用 idocker.vip，Web 控制台沿用同一域名。
  // 若线上控制台另有地址（例如 :7588 端口直连），只需改这一处。
  var CONSOLE_URL = 'https://idocker.vip';

  var LANG_KEY = 'idocker-web-locale';
  var THEME_KEY = 'theme';

  /* ---------------------------------------------------------------------
   * 文案字典
   * 中文原文直接写在 index.html 中（首屏无 JS 也可读），首次加载时缓存为
   * 中文源；此处只需维护英文一份，避免两份文案失去同步。
   * ------------------------------------------------------------------- */

  var EN = {
    'a11y.skip': 'Skip to main content',

    'nav.features': 'Features',
    'nav.architecture': 'Architecture',
    'nav.roles': 'Roles & Permissions',
    'nav.quickstart': 'Quick Start',
    'nav.stack': 'Tech Stack',
    'nav.faq': 'FAQ',
    'nav.console': 'Open Console',

    'hero.badge1': 'Enterprise-grade',
    'hero.badge2': 'Self-hosted',
    'hero.badge3': 'MIT License',
    'hero.title': 'Enterprise Docker Registry Management Platform',
    'hero.subtitle':
      'Organize images with a Namespace → Project → Repository model, with repository-level member permissions, a full Docker Registry v2 proxy and a complete audit trail — the Web UI and the Docker CLI share one account system.',
    'hero.ctaPrimary': 'Quick Start',
    'hero.ctaSecondary': 'Explore Features',
    'hero.note':
      'A single-segment path belongs to the built-in default project (the shared base-image library); a two-segment path means project/repository.',

    'features.title': 'Core Features',
    'features.subtitle':
      'Built around day-to-day registry operations: clear structure, visible state, complete records.',
    'features.f1.title': 'Three-layer resource model',
    'features.f1.desc':
      'Namespace → Project → Repository isolates teams, environments and business resources.',
    'features.f2.title': 'Built-in public library',
    'features.f2.desc':
      'The built-in default project holds base images such as mysql / redis / nginx / jdk under single-segment paths, visible and pullable for every signed-in user.',
    'features.f3.title': 'Repository-level permissions',
    'features.f3.desc':
      'Four system roles, with membership granted at repository level (repository_members) and effective immediately.',
    'features.f4.title': 'Docker Registry v2 proxy',
    'features.f4.desc':
      'A complete proxy for the Docker Registry v2 API, integrating authentication, authorization and operation logging.',
    'features.f5.title': 'Instant sync on push',
    'features.f5.desc':
      'Tags are recorded as soon as you push — no manual sync; the newest tag is automatically re-published as latest.',
    'features.f6.title': 'Audit log',
    'features.f6.desc':
      'A complete record of operations with search, filtering, export and time-based cleanup.',
    'features.f7.title': 'Bilingual UI',
    'features.f7.desc':
      'Built-in zh-CN / en-US message sets, switchable on the fly in the interface.',
    'features.f8.title': 'Theme switching',
    'features.f8.desc':
      'Light / dark / follow-system modes driven by CSS variables, with the preference stored locally.',

    'arch.title': 'Three-layer Architecture',
    'arch.subtitle':
      'Namespaces group resources for teams or environments; repository paths are decided by the project and the repository only.',
    'arch.l1.title': 'Namespace',
    'arch.l1.desc':
      'A management grouping for teams or environments; it never appears in a repository path.',
    'arch.l2.title': 'Project',
    'arch.l2.desc':
      'The container and authorization boundary for repositories; its name is the first path segment.',
    'arch.l3.title': 'Repository',
    'arch.l3.desc':
      'The actual image carrier, holding tags, sizes and push timestamps.',
    'arch.pathTitle': 'Image path rules',
    'arch.defaultTitle': 'The built-in default project',
    'arch.defaultDesc':
      'The default project under the default namespace is a protected base-image library: it cannot be deleted, renamed or deactivated. Its images are visible and pullable by every signed-in user, while pushing is limited to administrators or authorized members.',
    'arch.defaultNote':
      'Protection covers deletion, renaming and deactivation alike, so it cannot be bypassed by renaming first.',

    'roles.title': 'Roles and Permissions',
    'roles.subtitle':
      'System roles decide what you can reach in the console; repository member roles decide what you can do through Docker.',
    'roles.tableCaption': 'System roles and permission scope',
    'roles.th.role': 'Role',
    'roles.th.scope': 'Scope',
    'roles.th.docker': 'Docker permissions',
    'roles.admin.scope': 'All resources and projects, no membership required',
    'roles.pm.scope': 'Member management for owned projects',
    'roles.dev.scope': 'Read and write for authorized repositories',
    'roles.op.scope': 'Read-only access to authorized repositories',
    'roles.memberTitle': 'Repository membership is the only source of Docker permissions',
    'roles.memberDesc':
      'The repository_members table records who holds which role in which repository — project_manager / developer / operator — with one membership row per user per repository.',

    'qs.title': 'Quick Start',
    'qs.subtitle': 'A Web user is a registry user: you log in to Docker with the platform account.',
    'qs.s1.title': 'Log in to the registry',
    'qs.s1.desc':
      'Enter your platform account and password. Credentials are stored in your local Docker configuration.',
    'qs.s2.title': 'Pull an image',
    'qs.s2.desc':
      'Base images in the default project are pullable by everyone; for project images use the project/repository path.',
    'qs.s3.title': 'Push an image',
    'qs.s3.desc':
      'Tags are recorded immediately after a push; when a repository has multiple tags, the newest one is automatically synced as the latest reference.',
    'qs.deployTitle': 'Self-hosted deployment',
    'qs.accountTitle': 'Default administrator',
    'qs.accountDesc':
      'The first start creates the default <code>admin</code> account and the default namespace <code>default</code>. Change the default password right after signing in.',
    'qs.accountNote':
      'See the deployment documentation for the initial password; this page does not publish plaintext credentials.',

    'common.copy': 'Copy',

    'stack.title': 'Tech Stack',
    'stack.subtitle':
      'Two separately built subsystems: the frontend SPA and the backend API service.',
    'stack.frontend': 'Frontend <code>idocker-registry-ui</code>',
    'stack.backend': 'Backend <code>idocker-registry-server</code>',
    'stack.apiCaption': 'REST API endpoints',
    'stack.th.endpoint': 'Endpoint',
    'stack.th.desc': 'Description',
    'stack.api.auth': 'Login, registration, token refresh',
    'stack.api.users': 'User management (admin only)',
    'stack.api.ns': 'Namespace CRUD',
    'stack.api.projects': 'Project management',
    'stack.api.repo': 'Repositories, image tags, repository members',
    'stack.api.audit': 'Audit logs',
    'stack.api.sync': 'Image synchronization',
    'stack.api.v2': 'Docker Registry API proxy',

    'faq.title': 'FAQ',
    'faq.q1': 'Why does push say the repository does not exist?',
    'faq.a1':
      'Non-administrators cannot create repositories by pushing. Create the project and repository in the Web UI first, then push.',
    'faq.q2': 'Which version does docker pull fetch without a tag?',
    'faq.a2':
      'Without a tag, Docker pulls latest. The platform automatically syncs the newest tag as the latest reference, so you always get the most recent build.',
    'faq.q3': 'Can the default project be deleted or renamed?',
    'faq.a3':
      'No. The default namespace and the default project are protected — deletion, renaming and deactivation are all rejected.',
    'faq.q4': 'What are the password rules?',
    'faq.a4':
      'A password needs at least 6 characters including at least 1 special symbol. Administrators can reset passwords in user management; users can change their own in the profile page.',
    'faq.q5': 'Why do timestamps look different from server time?',
    'faq.a5':
      'The server runs on Asia/Shanghai, the database stores UTC ISO strings, and the Web UI renders them in your browser time zone — this is expected.',
    'faq.q6': 'Can a pushed image tag be deleted?',
    'faq.a6':
      'Yes. Deletion is enabled in the internal registry, so roles with delete permission can remove tags from the image detail page.',

    'cta.title': 'Take control of your image registry',
    'cta.subtitle':
      'Self-hosted deployment keeps your data and credentials on your own infrastructure.',

    'footer.tagline': 'Enterprise Docker Registry Management Platform',
    'footer.copyright': 'Powered by idocker-registry.',
    'footer.official': 'Official links',
    'footer.license': 'MIT License'
  };

  /* ---------------------------------------------------------------------
   * 语言
   * ------------------------------------------------------------------- */

  var i18nNodes = Array.prototype.slice.call(
    document.querySelectorAll('[data-i18n]')
  );

  // 缓存中文原文（HTML 即中文源），供切回中文时还原。
  var zhCache = new Map();
  i18nNodes.forEach(function (el) {
    zhCache.set(el, el.innerHTML);
  });

  function currentLang() {
    try {
      return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh';
    } catch (e) {
      return 'zh';
    }
  }

  function renderLang(lang) {
    i18nNodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (lang === 'en') {
        if (Object.prototype.hasOwnProperty.call(EN, key)) {
          el.innerHTML = EN[key];
        }
      } else {
        el.innerHTML = zhCache.get(el);
      }
    });

    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

    var toggle = document.getElementById('langToggle');
    if (toggle) {
      toggle.textContent = lang === 'en' ? '中文' : 'EN';
      toggle.setAttribute(
        'aria-label',
        lang === 'en' ? '切换到中文' : 'Switch to English'
      );
    }

    // 语言切换会改动 DOM，重新按语言刷新结构性属性
    applyStaticTexts(lang);
  }

  function setLang(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      /* localStorage 不可用时仅本次生效 */
    }
    renderLang(lang);
  }

  // 非 data-i18n 节点的少量文案（按钮 title 等）
  function applyStaticTexts(lang) {
    var copyBtns = document.querySelectorAll('.copy-btn');
    Array.prototype.forEach.call(copyBtns, function (btn) {
      if (btn.classList.contains('is-copied')) {
        btn.querySelector('span').textContent =
          lang === 'en' ? 'Copied' : '已复制';
      }
    });
  }

  /* ---------------------------------------------------------------------
   * 主题：light → dark → auto
   * 与应用保持一致：通过 body.dark-theme 切换，偏好写入 localStorage.theme
   * ------------------------------------------------------------------- */

  var media = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  var THEME_ORDER = ['light', 'dark', 'auto'];

  function storedTheme() {
    try {
      var value = localStorage.getItem(THEME_KEY);
      return THEME_ORDER.indexOf(value) >= 0 ? value : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function effectiveTheme(theme) {
    if (theme === 'auto') {
      return media && media.matches ? 'dark' : 'light';
    }
    return theme;
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', effectiveTheme(theme) === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }

  function cycleTheme() {
    var next = THEME_ORDER[(THEME_ORDER.indexOf(storedTheme()) + 1) % THEME_ORDER.length];
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      /* 忽略 */
    }
    applyTheme(next);
    syncThemeTitle();
  }

  var THEME_LABELS = {
    zh: { light: '浅色', dark: '深色', auto: '跟随系统' },
    en: { light: 'light', dark: 'dark', auto: 'follow system' }
  };

  function syncThemeTitle() {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    var lang = currentLang();
    var mode = THEME_LABELS[lang][storedTheme()];
    toggle.setAttribute('title', (lang === 'en' ? 'Theme: ' : '主题：') + mode);
    toggle.setAttribute('aria-label', (lang === 'en' ? 'Theme: ' : '主题：') + mode);
  }

  /* ---------------------------------------------------------------------
   * 复制按钮
   * ------------------------------------------------------------------- */

  function initCopy() {
    var buttons = document.querySelectorAll('.copy-btn');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy') || '';
        var label = btn.querySelector('span');
        var done = function () {
          btn.classList.add('is-copied');
          if (label) label.textContent = currentLang() === 'en' ? 'Copied' : '已复制';
          window.setTimeout(function () {
            btn.classList.remove('is-copied');
            if (label) label.textContent = currentLang() === 'en' ? 'Copy' : '复制';
          }, 1800);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {
            fallbackCopy(text, done);
          });
        } else {
          fallbackCopy(text, done);
        }
      });
    });
  }

  function fallbackCopy(text, done) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {
      /* 复制不可用时静默失败，用户仍可手动选中 */
    }
    document.body.removeChild(area);
  }

  /* ---------------------------------------------------------------------
   * 移动端导航
   * ------------------------------------------------------------------- */

  function initNav() {
    var menuBtn = document.getElementById('menuToggle');
    var nav = document.getElementById('siteNav');

    if (menuBtn && nav) {
      menuBtn.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      nav.addEventListener('click', function (event) {
        if (event.target.tagName === 'A') {
          nav.classList.remove('is-open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 当前区块高亮
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
    var sections = links
      .map(function (a) {
        return document.querySelector(a.getAttribute('href'));
      })
      .filter(Boolean);

    if (!sections.length || typeof IntersectionObserver === 'undefined') return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle(
              'is-active',
              a.getAttribute('href') === '#' + entry.target.id
            );
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ---------------------------------------------------------------------
   * 启动
   * ------------------------------------------------------------------- */

  function init() {
    var consoleLinks = [
      document.getElementById('consoleLink'),
      document.getElementById('consoleLinkBottom')
    ];
    consoleLinks.forEach(function (link) {
      if (link) link.setAttribute('href', CONSOLE_URL);
    });

    renderLang(currentLang());
    applyTheme(storedTheme());
    syncThemeTitle();

    var langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.addEventListener('click', function () {
        setLang(currentLang() === 'en' ? 'zh' : 'en');
        syncThemeTitle();
      });
    }

    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', cycleTheme);
    }

    if (media) {
      var onSchemeChange = function () {
        applyTheme(storedTheme());
      };
      if (media.addEventListener) {
        media.addEventListener('change', onSchemeChange);
      } else if (media.addListener) {
        media.addListener(onSchemeChange);
      }
    }

    initCopy();
    initNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
