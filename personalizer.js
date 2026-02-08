/**
 * IntentFinder Personalizer — AI-only; layout from LAYOUTS.
 * Supports OpenAI and local Ollama: set aiProvider to 'openai', 'ollama', or 'auto'.
 * With Ollama: run `ollama serve` and set ollamaBaseUrl (default http://localhost:11434), ollamaModel (e.g. llama3.2).
 */

(function () {
  'use strict';

  var CONFIG = {
    enabled: true,
    assetBase: '',
    debug: true,
    // If true, require a `q` or `query` URL parameter to run personalization.
    requireQuery: true,
    // If true, the script will auto-run on DOMContentLoaded. Set false to use as a plugin and call init()/run() manually.
    autoRun: true,
    get openaiApiKey() {
      return (typeof window !== 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.openaiApiKey) || '';
    },
    openaiModel: 'gpt-4o-mini',
    openaiMaxTokens: 200,
    openaiGenerateMaxTokens: 700,
    // OpenRouter (hosted): set openrouterApiKey and optionally openrouterBaseUrl (default https://api.openrouter.ai) and openrouterModel.
    get openrouterApiKey() {
      return (typeof window !== 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.openrouterApiKey) || '';
    },
    get openrouterBaseUrl() {
      return (typeof window !== 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.openrouterBaseUrl) || 'https://api.openrouter.ai';
    },
    get openrouterModel() {
      return (typeof window !== 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.openrouterModel) || 'gpt-4o-mini';
    },
    // Ollama (local): set ollamaBaseUrl (e.g. http://localhost:11434) and ollamaModel (e.g. llama3.2). Use aiProvider: 'ollama' or 'auto'.
    get ollamaBaseUrl() {
      return (typeof window != 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.ollamaBaseUrl) || 'http://localhost:11434';
    },
    get ollamaModel() {
      return (typeof window != 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.ollamaModel) || 'llama3.2';
    },
    get aiProvider() {
      var p = (typeof window != 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.aiProvider) || 'auto';
      return (p == 'openai' || p == 'openrouter' || p == 'ollama' || p == 'auto') ? p : 'auto';
    },
    get ollamaRequestTimeout() {
      return (typeof window != 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.ollamaRequestTimeout) || 120000;
    },
    get ollamaKeepAlive() {
      return (typeof window != 'undefined' && window.PersonalizerConfig && window.PersonalizerConfig.ollamaKeepAlive) || '10m';
    }
  };

  // Selectors used when injecting content. Can be overridden via init()
  CONFIG.selectors = {
    header: 'site-header',
    hero: 'site-hero',
    sectionHeading: 'section-heading',
    sectionSubheading: 'section-subheading',
    productGrid: 'product-grid',
    strip: 'site-strip',
    footer: 'site-footer'
  };

  // Expanded intents (categories for AI)
  var VALID_INTENTS = [
    'BUY_NOW', 'COMPARE', 'USE_CASE', 'BUDGET', 'GAMING', 'PROFESSIONAL',
    'CREATIVE', 'FAMILY', 'EXPLORE', 'SUPPORT', 'DEALS', 'DEFAULT'
  ];

  var ASSETS = {
    hero: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200&q=80',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80',
      'https://images.unsplash.com/photo-1586210579191-7b45ac67336c?w=1200&q=80',
      'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=1200&q=80',
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1200&q=80'
    ]
  };

  var HERO_IMAGE_BY_INTENT = {
    BUY_NOW: 4, COMPARE: 3, USE_CASE: 0, BUDGET: 5, GAMING: 0, PROFESSIONAL: 1,
    CREATIVE: 2, FAMILY: 5, EXPLORE: 3, SUPPORT: 1, DEALS: 5, DEFAULT: 1
  };

  // Intent → layout theme (from soft.html, neo.html, Cyber.html)
  var INTENT_TO_LAYOUT = {
    GAMING: 'cyber', PROFESSIONAL: 'neo', CREATIVE: 'soft', FAMILY: 'soft',
    BUDGET: 'soft', DEALS: 'minimal', COMPARE: 'neo', EXPLORE: 'modern', BUY_NOW: 'neo',
    USE_CASE: 'neo', SUPPORT: 'soft', DEFAULT: 'neo'
  };

  // Fallback copy when AI is not used (no key or failure)
  var DEFAULT_COPY = {
    headline: 'Premium Monitors for Work and Play',
    subheadline: '4K, high refresh rate, and color-accurate displays. Free shipping on orders over $199.',
    cta_text: 'Shop Monitors',
    cta_link: '/collections/all',
    section_heading: 'Featured Monitors',
    section_subheading: 'Our most popular displays for every use case.',
    strip_heading: 'Not sure which to choose?',
    strip_subheading: 'Compare specs side by side or talk to our experts.',
    strip_cta_text: 'Compare models',
    strip_cta_link: '/compare',
    badge: 'NEW COLLECTION',
    nav_links: [{ label: 'Shop', href: '/collections/all' }, { label: 'Compare', href: '/compare' }, { label: 'Deals', href: '/deals' }, { label: 'Support', href: '/support' }]
  };

  var PRODUCTS = [
    { image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80', title: 'Pro Gaming 27" 165Hz', subtitle: '1ms, 1440p, G-Sync', price: '$349', link: '/products/gaming-27', badge: 'Popular' },
    { image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80', title: 'Office Dual 24" FHD', subtitle: 'IPS, 75Hz, USB-C', price: '$229', link: '/products/office-24', badge: '' },
    { image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80', title: 'Design 4K 32"', subtitle: '99% sRGB, HDR', price: '$549', link: '/products/design-32', badge: '' },
    { image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&q=80', title: 'Value 24" 144Hz', subtitle: '1080p, 1ms', price: '$179', link: '/products/value-24', badge: 'Best value' },
    { image: 'https://images.unsplash.com/photo-1666771409964-4656b1099ccb?q=80&w=60', title: 'Ultrawide 34" Curved', subtitle: '1440p, 100Hz', price: '$429', link: '/products/ultrawide-34', badge: '' },
    { image: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=600&q=80', title: 'Pro 27" 4K', subtitle: 'Thunderbolt, 60Hz', price: '$699', link: '/products/pro-27', badge: '' }
  ];

  // Layout skeletons (from soft.html, neo.html, Cyber.html) — placeholders: {{key}}
  var LAYOUTS = {
    soft: {
      header: '<div class="py-6 px-10 flex justify-between items-center bg-[#F8F9FB]"><div class="font-extrabold text-2xl tracking-tight text-slate-800">{{logo}}</div><nav class="flex gap-10 font-semibold text-slate-500">{{nav_items}}</nav><div class="bg-white p-3 rounded-full shadow-sm">🛒</div></div>',
      hero: '<section class="max-w-7xl mx-auto px-6 py-12"><div class="bg-indigo-50 rounded-[3rem] p-12 lg:p-20 flex flex-col items-center text-center"><span class="bg-indigo-200 text-indigo-700 px-4 py-1 rounded-full text-sm font-bold mb-6">{{badge}}</span><h1 id="headline" class="text-5xl lg:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">{{headline}}</h1><p id="subheadline" class="text-slate-500 text-xl max-w-xl mb-10 leading-relaxed">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block px-8 py-4 rounded-full bg-slate-900 text-white font-bold mb-10">{{cta_text}}</a><img id="hero-image" src="{{hero_image}}" alt="" class="w-full max-w-3xl rounded-3xl shadow-2xl shadow-indigo-200/50"></div></section>',
      card: '<article class="group"><div class="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/60 mb-6 transition-transform group-hover:-translate-y-2"><img src="{{card_image}}" class="rounded-[2rem] mb-6 w-full aspect-video object-cover" alt=""><h3 class="text-xl font-bold mb-1">{{card_title}}</h3><p class="text-slate-400 text-sm mb-4">{{card_subtitle}}</p><div class="flex items-center justify-between"><span class="text-2xl font-extrabold">{{card_price}}</span><a href="{{card_link}}" class="bg-slate-900 text-white px-6 py-2 rounded-full font-bold">Details</a></div></div></article>',
      strip: '<section class="bg-indigo-600 text-white py-12"><div class="max-w-7xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-2xl font-bold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-indigo-100 mb-6 max-w-xl mx-auto">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-indigo-50">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-6 py-14"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 text-slate-400"><div><span class="font-bold text-white text-lg">MonitorHub</span><p class="mt-3 text-sm">Premium displays for work and play.</p></div><div><h4 class="font-semibold text-white mb-3">Shop</h4><ul class="space-y-2 text-sm"><li><a href="/collections/all" class="hover:text-white">All</a></li><li><a href="/compare" class="hover:text-white">Compare</a></li><li><a href="/deals" class="hover:text-white">Deals</a></li></ul></div><div><h4 class="font-semibold text-white mb-3">Support</h4><ul class="space-y-2 text-sm"><li><a href="/support" class="hover:text-white">Help</a></li><li><a href="/contact" class="hover:text-white">Contact</a></li></ul></div><div><h4 class="font-semibold text-white mb-3">Newsletter</h4><p class="text-sm mb-3">Get deals and new arrivals.</p><input type="email" placeholder="Email" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"><button type="button" class="mt-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm">Join</button></div></div><div class="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500 text-center">© 2026 MonitorHub</div></div>'
    },
    neo: {
      header: '<div class="p-8"><nav class="max-w-3xl mx-auto px-6 py-4 rounded-full flex justify-between items-center shadow-lg text-slate-800" style="background:rgba(255,255,255,0.4);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.6)"><span class="font-black italic text-xl tracking-tighter">{{logo}}</span><div class="flex gap-6 font-medium text-sm">{{nav_items}}</div></nav></div>',
      hero: '<section class="py-20 text-center px-4" style="background:radial-gradient(at top left, #e0e7ff 0%, #ffffff 40%, #f0fdfa 100%)"><h1 id="headline" class="text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">{{headline}}</h1><p id="subheadline" class="text-slate-600 font-medium max-w-lg mx-auto mb-10">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="relative inline-block"><span class="relative bg-white px-10 py-4 rounded-2xl font-bold shadow-sm">{{cta_text}}</span></a><img id="hero-image" src="{{hero_image}}" alt="" class="mt-10 max-w-3xl mx-auto rounded-2xl shadow-xl w-full object-cover max-h-[360px]" style="display:none"></section>',
      card: '<div class="p-5 rounded-[2rem] shadow-2xl shadow-indigo-100 group text-slate-800" style="background:rgba(255,255,255,0.4);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.6)"><div class="overflow-hidden rounded-[1.5rem] mb-6"><img src="{{card_image}}" class="group-hover:scale-110 transition duration-700 w-full aspect-video object-cover" alt=""></div><div class="px-2"><span class="text-xs font-bold text-teal-600 uppercase">Monitor</span><h3 class="text-xl font-bold mt-1">{{card_title}}</h3><p class="text-slate-500 text-sm mt-2">{{card_subtitle}}</p><div class="mt-6 flex items-center justify-between"><span class="text-2xl font-black">{{card_price}}</span><a href="{{card_link}}" class="h-10 w-10 rounded-full flex items-center justify-center font-bold border border-slate-300 hover:bg-indigo-600 hover:text-white transition">→</a></div></div></div>',
      strip: '<section class="bg-indigo-600 text-white py-12"><div class="max-w-7xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-2xl font-bold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-indigo-100 mb-6 max-w-xl mx-auto">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-indigo-50">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-8 py-14 text-slate-400"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-10"><div><span class="font-bold text-white text-lg">MonitorHub</span><p class="mt-3 text-sm">Premium displays. Fast shipping.</p></div><div><h4 class="font-semibold text-white mb-3">Shop</h4><ul class="space-y-2 text-sm"><li><a href="/collections/all" class="hover:text-white">All</a></li><li><a href="/compare" class="hover:text-white">Compare</a></li></ul></div><div><h4 class="font-semibold text-white mb-3">Support</h4><ul class="space-y-2 text-sm"><li><a href="/support" class="hover:text-white">Help</a></li></ul></div><div><h4 class="font-semibold text-white mb-3">Newsletter</h4><input type="email" placeholder="Email" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"><button type="button" class="mt-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm">Join</button></div></div><div class="mt-12 pt-8 border-t border-slate-800 text-sm text-center">© 2026 MonitorHub</div></div>'
    },
    cyber: {
      header: '<div class="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-indigo-900/50"><div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><span class="text-2xl font-bold tracking-tighter text-indigo-500" style="font-family:Orbitron,sans-serif">MONITOR<span class="text-white">HUB</span></span><nav class="hidden md:flex gap-8 uppercase text-xs tracking-widest font-bold text-slate-300">{{nav_items}}</nav><div class="text-xl">🛒</div></div></div>',
      hero: '<section class="relative py-20 overflow-hidden bg-black text-white"><div class="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 z-0"></div><div class="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center"><div><h1 id="headline" class="text-5xl lg:text-7xl mb-6 leading-none font-bold tracking-tight" style="font-family:Orbitron,sans-serif"><span class="text-indigo-500">{{headline}}</span></h1><p id="subheadline" class="text-slate-400 text-lg mb-8">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-none font-bold transition"><span>{{cta_text}}</span></a></div><img id="hero-image" src="{{hero_image}}" alt="" class="rounded-lg border-2 border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.2)] w-full object-cover max-h-[360px]"></div></section>',
      card: '<article class="bg-slate-900 border border-slate-800 p-4 group hover:border-indigo-500 transition-all text-white"><div class="relative mb-4 overflow-hidden"><img src="{{card_image}}" class="grayscale group-hover:grayscale-0 transition duration-500 w-full aspect-video object-cover" alt="">{{card_badge}}</div><h3 class="text-lg font-bold mb-2" style="font-family:Orbitron,sans-serif">{{card_title}}</h3><p class="text-slate-500 text-sm mb-4">{{card_subtitle}}</p><div class="flex justify-between items-center"><span class="text-2xl font-bold text-indigo-400">{{card_price}}</span><a href="{{card_link}}" class="text-xs font-bold border-b-2 border-indigo-500 pb-1 hover:text-indigo-400">VIEW SPECS</a></div></article>',
      strip: '<section class="bg-indigo-600 text-white py-12"><div class="max-w-7xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-2xl font-bold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-indigo-100 mb-6 max-w-xl mx-auto">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-indigo-50">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-6 py-14 text-slate-400 bg-black border-t border-slate-800"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-10"><div><span class="font-bold text-white text-lg" style="font-family:Orbitron,sans-serif">MONITORHUB</span><p class="mt-3 text-sm">Elite displays for pros.</p></div><div><h4 class="font-semibold text-white mb-3">Gear</h4><ul class="space-y-2 text-sm"><li><a href="/collections/all" class="hover:text-white">Shop</a></li><li><a href="/compare" class="hover:text-white">Compare</a></li></ul></div><div><h4 class="font-semibold text-white mb-3">Support</h4><ul class="space-y-2 text-sm"><li><a href="/support" class="hover:text-white">Help</a></li></ul></div><div><h4 class="font-semibold text-white mb-3">Newsletter</h4><input type="email" placeholder="Email" class="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"><button type="button" class="mt-2 px-4 py-2 rounded bg-indigo-500 text-white text-sm">Join</button></div></div><div class="mt-12 pt-8 border-t border-slate-800 text-sm text-center">© 2026 MonitorHub</div></div>'
    }
    ,
    minimal: {
      header: '<div class="px-6 py-4 max-w-7xl mx-auto"><div class="flex items-center justify-between"><div class="font-bold text-lg">MonitorHub</div><nav class="flex gap-6 text-sm text-slate-600">{{nav_items}}</nav></div></div>',
      hero: '<section class="max-w-4xl mx-auto px-6 py-16 text-center"><h1 id="headline" class="text-4xl font-extrabold text-slate-900 mb-4">{{headline}}</h1><p id="subheadline" class="text-slate-500 mb-6">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block px-6 py-3 bg-slate-900 text-white rounded-md">{{cta_text}}</a><img id="hero-image" src="{{hero_image}}" alt="" class="mt-8 w-full rounded-lg shadow-sm"></section>',
      card: '<div class="p-4 bg-white rounded-lg shadow-sm"><img src="{{card_image}}" class="w-full rounded-md mb-4 object-cover" alt=""><h3 class="font-semibold">{{card_title}}</h3><p class="text-sm text-slate-500">{{card_subtitle}}</p><div class="mt-4 flex items-center justify-between"><span class="font-bold">{{card_price}}</span><a href="{{card_link}}" class="text-sm text-slate-700">Details</a></div></div>',
      strip: '<section class="bg-slate-100 py-10"><div class="max-w-4xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-lg font-semibold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-slate-600 mb-4">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-4 py-2 bg-slate-900 text-white rounded">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-6 py-10 text-sm text-slate-500"><div class="flex justify-between"><div>© 2026 MonitorHub</div><div>{{nav_items}}</div></div></div>'
    },
    modern: {
      header: '<div class="py-6 px-8 bg-white/60 backdrop-blur-sm border-b"><div class="max-w-7xl mx-auto flex items-center justify-between"><div class="font-black text-xl">MonitorHub</div><nav class="flex gap-8 text-xs font-medium uppercase">{{nav_items}}</nav></div></div>',
      hero: '<section class="py-24 bg-gradient-to-r from-white to-slate-50"><div class="max-w-6xl mx-auto px-6 text-center"><h1 id="headline" class="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">{{headline}}</h1><p id="subheadline" class="text-slate-600 mb-8">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block px-8 py-3 bg-indigo-600 text-white rounded-md">{{cta_text}}</a><img id="hero-image" src="{{hero_image}}" alt="" class="mt-10 w-full rounded-lg shadow-lg"></div></section>',
      card: '<div class="p-6 bg-white rounded-2xl shadow-lg"><img src="{{card_image}}" class="w-full rounded-xl mb-4 object-cover" alt=""><h3 class="text-lg font-bold">{{card_title}}</h3><p class="text-sm text-slate-500">{{card_subtitle}}</p><div class="mt-6 flex items-center justify-between"><span class="text-xl font-extrabold">{{card_price}}</span><a href="{{card_link}}" class="px-3 py-2 bg-indigo-50 text-indigo-700 rounded">View</a></div></div>',
      strip: '<section class="py-12 bg-indigo-600 text-white"><div class="max-w-6xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-2xl font-bold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-indigo-100 mb-6">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-6 py-3 bg-white text-indigo-600 rounded">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-6 py-12 text-slate-400"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"><div><span class="font-bold text-white">MonitorHub</span><p class="mt-2 text-sm">Modern displays for every desk.</p></div><div><h4 class="font-semibold text-white mb-2">Shop</h4><ul class="space-y-2 text-sm">{{nav_items}}</ul></div></div><div class="mt-8 text-sm text-center">© 2026 MonitorHub</div></div>'
    },
    featuristic: {
      header: '<div class="py-4 px-6 bg-white"><div class="max-w-7xl mx-auto flex items-center justify-between"><div class="font-bold">MonitorHub</div><nav class="text-sm text-slate-600">{{nav_items}}</nav></div></div>',
      hero: '<section class="max-w-6xl mx-auto px-6 py-16"><div class="grid md:grid-cols-2 gap-8 items-center"><div><h1 id="headline" class="text-4xl font-extrabold mb-4">{{headline}}</h1><p id="subheadline" class="text-slate-600 mb-6">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block px-6 py-3 bg-indigo-600 text-white rounded">{{cta_text}}</a></div><div><img id="hero-image" src="{{hero_image}}" alt="" class="w-full rounded-lg shadow"></div></div></section>',
      card: '<div class="p-5 bg-white rounded-lg shadow-sm"><h3 class="font-bold mb-2">{{card_title}}</h3><p class="text-sm text-slate-500 mb-3">{{card_subtitle}}</p><ul class="text-xs text-slate-600 space-y-1 mb-4"><li>• Feature-rich panels</li><li>• High color accuracy</li><li>• Multiple inputs</li></ul><div class="flex items-center justify-between"><span class="font-extrabold">{{card_price}}</span><a href="{{card_link}}" class="text-indigo-600">Details</a></div></div>',
      strip: '<section class="py-10 bg-gradient-to-r from-slate-50 to-white"><div class="max-w-6xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-lg font-semibold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-slate-600 mb-4">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-4 py-2 bg-indigo-600 text-white rounded">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-6 py-10 text-sm text-slate-500"><div class="flex justify-between"><div>© 2026 MonitorHub</div><div>{{nav_items}}</div></div></div>'
    },
    artistic: {
      header: '<div class="py-6 px-8 bg-amber-50"><div class="max-w-7xl mx-auto flex items-center justify-between"><div class="font-serif font-bold text-xl">MonitorHub</div><nav class="italic text-sm text-slate-700">{{nav_items}}</nav></div></div>',
      hero: '<section class="py-24 bg-[url(https://images.unsplash.com/photo-1509223197845-458d87318791?w=1200&q=60)] bg-cover bg-center text-white"><div class="max-w-4xl mx-auto px-6 text-center backdrop-brightness-75 p-8 rounded-lg"><h1 id="headline" class="text-5xl font-extrabold mb-4">{{headline}}</h1><p id="subheadline" class="text-lg mb-6">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block px-6 py-3 bg-white text-indigo-700 rounded">{{cta_text}}</a></div></section>',
      card: '<div class="p-6 bg-white/90 rounded-2xl shadow-md"><img src="{{card_image}}" class="w-full rounded-lg mb-4 object-cover" alt=""><h3 class="text-lg font-bold">{{card_title}}</h3><p class="text-sm text-slate-600">{{card_subtitle}}</p></div>',
      strip: '<section class="py-12 bg-white"><div class="max-w-6xl mx-auto px-6 text-center"><h2 id="strip-heading" class="text-2xl font-semibold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-slate-600 mb-4">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-6 py-3 bg-indigo-600 text-white rounded">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-6 py-12 text-slate-500"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"><div><span class="font-bold">MonitorHub</span><p class="mt-2 text-sm">Design-forward displays.</p></div></div><div class="mt-6 text-sm text-center">© 2026 MonitorHub</div></div>'
    },
    compact: {
      header: '<div class="px-4 py-3"><div class="max-w-7xl mx-auto flex items-center justify-between"><div class="font-semibold">MonitorHub</div><nav class="text-sm">{{nav_items}}</nav></div></div>',
      hero: '<section class="py-12"><div class="max-w-4xl mx-auto px-4 text-center"><h1 id="headline" class="text-3xl font-bold mb-2">{{headline}}</h1><p id="subheadline" class="text-sm text-slate-600 mb-4">{{subheadline}}</p><a id="cta" href="{{cta_link}}" class="inline-block px-4 py-2 bg-slate-900 text-white rounded">{{cta_text}}</a></div></section>',
      card: '<div class="p-3 bg-white rounded-lg shadow-sm"><img src="{{card_image}}" class="w-full rounded mb-3 object-cover" alt=""><h4 class="text-sm font-semibold">{{card_title}}</h4><div class="mt-2 flex items-center justify-between"><span class="text-sm font-bold">{{card_price}}</span><a href="{{card_link}}" class="text-xs">View</a></div></div>',
      strip: '<section class="py-8 bg-slate-50"><div class="max-w-4xl mx-auto px-4 text-center"><h2 id="strip-heading" class="text-sm font-semibold mb-2">{{strip_heading}}</h2><p id="strip-subheading" class="text-sm text-slate-500 mb-3">{{strip_subheading}}</p><a id="strip-cta" href="{{strip_cta_link}}" class="inline-block px-3 py-2 bg-slate-900 text-white rounded text-sm">{{strip_cta_text}}</a></div></section>',
      footer: '<div class="max-w-7xl mx-auto px-4 py-8 text-sm text-slate-500"><div class="flex justify-between"><div>© 2026 MonitorHub</div><div>{{nav_items}}</div></div></div>'
    }
  };

  // Cyber hero uses {{headline}} inside the h1 as the accent part; we pass full headline or short tag. For simplicity we use headline as the main text and optionally a short tag.
  function buildNavItems(links) {
    if (!links || !links.length) links = DEFAULT_COPY.nav_links;
    return links.map(function (l) {
      return '<a href="' + (l.href || '#') + '" class="hover:text-black">' + (l.label || '') + '</a>';
    }).join('');
  }

  function buildCardsHtml(layoutKey, products, cardTpl) {
    return (products || PRODUCTS).map(function (p) {
      return cardTpl
        .replace(/\{\{card_image\}\}/g, p.image || '')
        .replace(/\{\{card_title\}\}/g, p.title || '')
        .replace(/\{\{card_subtitle\}\}/g, p.subtitle || '')
        .replace(/\{\{card_price\}\}/g, p.price || '')
        .replace(/\{\{card_link\}\}/g, p.link || '#')
        .replace(/\{\{card_badge\}\}/g, p.badge ? '<div class="absolute top-2 right-2 bg-indigo-600 text-[10px] px-2 py-1 font-bold">' + p.badge + '</div>' : '');
    }).join('');
  }

  function applyPlaceholders(str, map) {
    if (!str) return '';
    var out = str;
    Object.keys(map).forEach(function (k) {
      out = out.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), map[k] != null ? String(map[k]) : '');
    });
    return out;
  }

  function buildContextForOpenAI() {
    var params = new URLSearchParams(window.location.search);
    return {
      query: params.get('q') || params.get('query') || '',
      utm_campaign: params.get('utm_campaign') || params.get('utm_content') || params.get('utm_source') || '',
      referrer: document.referrer || '(none)',
      pathname: window.location.pathname || '',
      page_title: (document && document.title) ? document.title : '',
      user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '',
      language: (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : ''
    };
  }

  function parseJsonFromResponse(text) {
    if (!text || typeof text !== 'string') return null;
    var m = text.trim().match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (_) { return null; }
  }

  // Resolve which AI provider to use: 'openai' if key + (provider is openai or auto), else 'ollama' if provider is ollama or auto
  function resolveProvider() {
    var p = CONFIG.aiProvider;
    if (p === 'openai' && CONFIG.openaiApiKey) return 'openai';
    if (p === 'openrouter' && CONFIG.openrouterApiKey) return 'openrouter';
    if (p === 'ollama') return 'ollama';
    if (p === 'auto') {
      if (CONFIG.openaiApiKey) return 'openai';
      if (CONFIG.openrouterApiKey) return 'openrouter';
      return 'ollama';
    }
    return null;
  }

  function hasAIProvider() {
    return resolveProvider() !== null;
  }

  // Single chat completion: OpenAI or Ollama. messages = [{ role, content }], returns content string or null
  async function chatCompletion(messages, maxTokens, options) {
    options = options || {};
    var provider = resolveProvider();
    if (!provider) return null;

    if (provider === 'openai') {
      try {
        var res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CONFIG.openaiApiKey },
          body: JSON.stringify({
            model: CONFIG.openaiModel,
            max_tokens: maxTokens,
            messages: messages,
            temperature: options.temperature != null ? options.temperature : 0.35
          })
        });
        if (!res.ok) throw new Error('OpenAI ' + res.status);
        var data = await res.json();
        var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        return content || null;
      } catch (err) {
        if (CONFIG.debug) console.warn('OpenAI chat failed:', err.message);
        return null;
      }
    }

    if (provider === 'openrouter') {
      try {
        var base = (CONFIG.openrouterBaseUrl || '').replace(/\/$/, '') || 'https://api.openrouter.ai';
        var resOR = await fetch(base + '/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CONFIG.openrouterApiKey },
          body: JSON.stringify({
            model: CONFIG.openrouterModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: options.temperature != null ? options.temperature : 0.35
          })
        });
        if (!resOR.ok) throw new Error('OpenRouter ' + resOR.status);
        var dataOR = await resOR.json();
        var contentOR = dataOR.choices && dataOR.choices[0] && dataOR.choices[0].message && dataOR.choices[0].message.content;
        return contentOR || null;
      } catch (err) {
        if (CONFIG.debug) console.warn('OpenRouter chat failed:', err.message);
        return null;
      }
    }

    if (provider === 'ollama') {
      var url = (CONFIG.ollamaBaseUrl || '').replace(/\/$/, '') + '/api/chat';
      var body = {
        model: CONFIG.ollamaModel,
        messages: messages,
        stream: false,
        keep_alive: CONFIG.ollamaKeepAlive || '10m',
        options: { num_predict: maxTokens, temperature: options.temperature != null ? options.temperature : 0.35 }
      };
      if (options.format === 'json') body.format = 'json';
      var timeoutMs = CONFIG.ollamaRequestTimeout || 120000;
      var doRequest = function () {
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs);
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        }).then(function (res) {
          clearTimeout(timeoutId);
          return res;
        }).catch(function (err) {
          clearTimeout(timeoutId);
          throw err;
        });
      };
      var lastErr;
      for (var attemptCount = 0; attemptCount < 2; attemptCount++) {
        try {
          if (attemptCount > 0) await new Promise(function (r) { setTimeout(r, 2000); });
          var ollamaRes = await doRequest();
          if (!ollamaRes.ok) throw new Error('Ollama ' + ollamaRes.status);
          var ollamaData = await ollamaRes.json();
          var text = ollamaData.message && ollamaData.message.content;
          if (text) return text;
        } catch (err) {
          lastErr = err;
          if (CONFIG.debug) console.warn('Ollama attempt ' + (attemptCount + 1) + ' failed:', err.message);
          if (err.name === 'AbortError' && CONFIG.debug) console.warn('Ollama: timed out after ' + (timeoutMs / 1000) + 's. Model may be loading; retrying once in 2s.');
        }
      }
      if (CONFIG.debug && lastErr) console.warn('Ollama chat failed after retry:', lastErr.message);
      return null;
    }

    return null;
  }

  var GENERATED_KEYS = ['headline', 'subheadline', 'cta_text', 'cta_link', 'section_heading', 'section_subheading', 'strip_heading', 'strip_subheading', 'strip_cta_text', 'strip_cta_link', 'badge', 'layout_style', 'nav_links'];

  function sanitizeGenerated(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var out = {};
    // allow extended layout styles including those we added
    var allowedLayouts = ['soft','neo','cyber','minimal','modern','featuristic','artistic','compact'];
    GENERATED_KEYS.forEach(function (k) {
      try {
        if (k === 'nav_links' && Array.isArray(obj[k])) {
          // validate nav links: array of {label, href} with relative hrefs
          var safeNav = [];
          obj[k].forEach(function (item) {
            if (!item || typeof item !== 'object') return;
            var label = typeof item.label === 'string' ? item.label.trim() : '';
            var href = typeof item.href === 'string' ? item.href.trim() : '';
            if (!label) return;
            // prefer relative paths only
            if (href && (href.indexOf('/') !== 0)) return;
            safeNav.push({ label: label, href: href || '#' });
          });
          if (safeNav.length) out[k] = safeNav;
        } else if (k === 'layout_style' && typeof obj[k] === 'string' && allowedLayouts.indexOf(obj[k]) !== -1) {
          out[k] = obj[k];
        } else if (typeof obj[k] === 'string' && obj[k].trim()) {
          // limit lengths for safety
          var v = obj[k].trim();
          if (k === 'headline') v = v.substring(0, 120);
          if (k === 'subheadline') v = v.substring(0, 240);
          if (k === 'cta_text') v = v.substring(0, 60);
          if (k === 'cta_link' || k === 'strip_cta_link') {
            // only allow relative links
            if (v.indexOf('/') === 0) out[k] = v; else out[k] = '';
          } else {
            out[k] = v;
          }
        }
      } catch (e) {
        if (CONFIG.debug) console.warn('sanitizeGenerated item failed for', k, e);
      }
    });
    return Object.keys(out).length ? out : null;
  }

  async function classifyAndGenerateWithAI() {
    var ctx = buildContextForOpenAI();
    var rawQuery = (ctx.query || '').trim();
    if (!hasAIProvider() || !rawQuery) return null;

    var systemPrompt = [
      'You are a personalization engine for an e-commerce site selling computer monitors.',
      'Given a visitor\'s raw search or intent, you must:',
      '(1) Classify intent into exactly ONE category: BUY_NOW, COMPARE, USE_CASE, BUDGET, GAMING, PROFESSIONAL, CREATIVE, FAMILY, EXPLORE, SUPPORT, DEALS, DEFAULT. Include a numeric "confidence" (0.0-1.0) for classification.',
      '(2) Write a short "visitor_context" (1-3 sentences) describing their needs and what messaging would resonate. Use available context: query, utm_campaign/source, referrer, page_title, pathname, user_agent, language.',
      '(3) Choose layout_style from: soft, neo, cyber, minimal, modern, featuristic, artistic, compact. Match tone to intent.',
      '(4) Generate tailored copy. Return ONLY a JSON object with these keys (use strings unless noted): intent, confidence (number), reason, visitor_context, layout_style, badge, headline, subheadline, cta_text, cta_link, section_heading, section_subheading, strip_heading, strip_subheading, strip_cta_text, strip_cta_link, nav_links (array of {label, href}, 3-5 items).',
      'Headlines under 80 chars. Use relative path links only (e.g. /collections/all). No markdown or extraneous text. Respond with valid JSON only.'
    ].join(' ');

    var userContent = 'Visitor intent: "' + rawQuery.replace(/"/g, '\\"') + '". UTM: "' + (ctx.utm_campaign || '') + '". Referrer: ' + (ctx.referrer || 'none') + '. Page: ' + (ctx.page_title || '') + ' Path: ' + (ctx.pathname || '') + ' UA: ' + (ctx.user_agent || '') + ' Lang: ' + (ctx.language || '');

    var content = await chatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
      CONFIG.openaiGenerateMaxTokens,
      { temperature: 0.35, format: 'json' }
    );
    if (!content) return null;
    var obj = parseJsonFromResponse(content);
    if (!obj || !obj.intent || VALID_INTENTS.indexOf(obj.intent) === -1) return null;
    var generated = sanitizeGenerated(obj);
    if (!generated) return null;
    var provider = resolveProvider();
    return {
      intent: obj.intent,
      signals: [(provider || 'ai') + ': ' + (obj.reason || '')],
      visitor_context: typeof obj.visitor_context === 'string' ? obj.visitor_context.trim() : '',
      generatedContent: generated
    };
  }

  async function detectIntentOpenAI() {
    if (!hasAIProvider()) return null;
    var ctx = buildContextForOpenAI();
    if ((ctx.query || '').trim()) return null;
    var systemPrompt = 'Classify visitor intent for a monitor e-commerce site. Use available context: query, utm_campaign/source, referrer, page_title, pathname, user_agent, language. Return ONLY JSON: {"intent": "...", "confidence": 0.0-1.0, "reason": "..."}. Intent must be one of: BUY_NOW, COMPARE, USE_CASE, BUDGET, GAMING, PROFESSIONAL, CREATIVE, FAMILY, EXPLORE, SUPPORT, DEALS, DEFAULT. Confidence should be a number between 0 and 1. No extra text.';
    var content = await chatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'referrer: ' + ctx.referrer + ', utm: ' + ctx.utm_campaign }],
      CONFIG.openaiMaxTokens,
      { temperature: 0.2, format: 'json' }
    );
    if (!content) return null;
    var obj = parseJsonFromResponse(content);
    if (obj && obj.intent && VALID_INTENTS.indexOf(obj.intent) !== -1) {
      var provider = resolveProvider();
      var signals = [(provider || 'ai') + ': ' + (obj.reason || '')];
      if (typeof obj.confidence === 'number') signals.push('confidence:' + obj.confidence);
      return { intent: obj.intent, signals: signals };
    }
    return null;
  }

  function detectIntentRules() {
    var signals = [];
    var intent = 'DEFAULT';
    var params = new URLSearchParams(window.location.search);
    var q = (params.get('q') || params.get('query') || '').toLowerCase();
    var persona = (params.get('persona') || '').toLowerCase();
    var utm = (params.get('utm_campaign') || params.get('utm_content') || '').toLowerCase();

    var personaMap = { buy: 'BUY_NOW', compare: 'COMPARE', explore: 'EXPLORE', budget: 'BUDGET', gaming: 'GAMING', professional: 'PROFESSIONAL', creative: 'CREATIVE', family: 'FAMILY', support: 'SUPPORT', deals: 'DEALS', usecase: 'USE_CASE' };
    if (personaMap[persona]) return { intent: personaMap[persona], signals: ['persona=' + persona] };

    var buyWords = ['buy', 'purchase', 'order', 'checkout'];
    var compareWords = ['compare', 'comparison', 'vs', 'versus', 'review'];
    var useCaseWords = ['gaming', 'coding', 'design', 'work', 'office', 'creative'];
    var budgetWords = ['cheap', 'budget', 'affordable', 'deal', 'discount', 'under'];
    var gamingWords = ['gaming', 'esports', '165hz', 'g-sync'];
    var familyWords = ['kid', 'child', 'student', 'family'];
    var allText = [q, utm].join(' ');

    if (familyWords.some(function (w) { return allText.indexOf(w) !== -1; })) intent = 'FAMILY';
    else if (gamingWords.some(function (w) { return allText.indexOf(w) !== -1; })) intent = 'GAMING';
    else if (buyWords.some(function (w) { return allText.indexOf(w) !== -1; })) intent = 'BUY_NOW';
    else if (compareWords.some(function (w) { return allText.indexOf(w) !== -1; })) intent = 'COMPARE';
    else if (budgetWords.some(function (w) { return allText.indexOf(w) !== -1; })) intent = 'BUDGET';
    else if (useCaseWords.some(function (w) { return allText.indexOf(w) !== -1; })) intent = 'USE_CASE';

    var ref = document.referrer || '';
    if (/google\.|bing|search/i.test(ref)) { signals.push('referrer:search'); if (intent === 'DEFAULT') intent = 'COMPARE'; }
    else if (ref && intent === 'DEFAULT') intent = 'BUY_NOW';
    if (q || utm) signals.push('query:' + (q || utm));
    return { intent: intent, signals: signals };
  }

  async function generateCopyForIntent(intent) {
    if (!hasAIProvider()) return null;
    var systemPrompt = [
      'Generate tailored e-commerce copy for a monitor store. Intent category: ' + intent + '.',
      'Return ONLY a JSON object with: layout_style (one of soft, neo, cyber), badge, headline, subheadline, cta_text, cta_link, section_heading, section_subheading, strip_heading, strip_subheading, strip_cta_text, strip_cta_link, nav_links (array of {label, href}).',
      'Match tone to intent: GAMING=bold/cyber, CREATIVE/FAMILY/BUDGET=soft, COMPARE/EXPLORE/PRO=neo. No markdown.'
    ].join(' ');
    var content = await chatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate copy for intent: ' + intent }],
      CONFIG.openaiGenerateMaxTokens,
      { temperature: 0.35, format: 'json' }
    );
    if (!content) return null;
    var obj = parseJsonFromResponse(content);
    if (!obj) return null;
    return sanitizeGenerated(obj);
  }

  async function detectIntent() {
    var persona = new URLSearchParams(window.location.search).get('persona');
    if (persona) return detectIntentRules();
    var aiFull = await classifyAndGenerateWithAI();
    if (aiFull) return aiFull;
    var openaiResult = await detectIntentOpenAI();
    if (openaiResult) return openaiResult;
    return detectIntentRules();
  }

  function getDecision(intentResult) {
    var intent = intentResult.intent;
    var signals = intentResult.signals || [];
    var gen = intentResult.generatedContent || null;
    var layoutStyle = (gen && gen.layout_style) ? gen.layout_style : (INTENT_TO_LAYOUT[intent] || 'neo');
    var imageIndex = HERO_IMAGE_BY_INTENT[intent] !== undefined ? HERO_IMAGE_BY_INTENT[intent] : 1;
    var hero_image = (CONFIG.assetBase + ASSETS.hero[imageIndex]).replace(/^\/+/, '');
    if (hero_image.indexOf('http') !== 0) hero_image = window.location.origin + '/' + hero_image;

    var c = DEFAULT_COPY;
    return {
      intent: intent,
      layout_style: layoutStyle,
      hero_image: hero_image,
      headline: (gen && gen.headline) ? gen.headline : c.headline,
      subheadline: (gen && gen.subheadline) ? gen.subheadline : c.subheadline,
      cta_text: (gen && gen.cta_text) ? gen.cta_text : c.cta_text,
      cta_link: (gen && gen.cta_link) ? gen.cta_link : c.cta_link,
      section_heading: (gen && gen.section_heading) ? gen.section_heading : c.section_heading,
      section_subheading: (gen && gen.section_subheading) ? gen.section_subheading : c.section_subheading,
      strip_heading: (gen && gen.strip_heading) ? gen.strip_heading : c.strip_heading,
      strip_subheading: (gen && gen.strip_subheading) ? gen.strip_subheading : c.strip_subheading,
      strip_cta_text: (gen && gen.strip_cta_text) ? gen.strip_cta_text : c.strip_cta_text,
      strip_cta_link: (gen && gen.strip_cta_link) ? gen.strip_cta_link : c.strip_cta_link,
      badge: (gen && gen.badge) ? gen.badge : c.badge,
      nav_links: (gen && gen.nav_links && gen.nav_links.length) ? gen.nav_links : c.nav_links,
      reason: signals.length ? 'Intent "' + intent + '" from: ' + signals.join(', ') : 'Default',
      visitor_context: intentResult.visitor_context || null,
      generated: !!gen
    };
  }

  function inject(decision) {
    if (!decision) return false;
    var layout = LAYOUTS[decision.layout_style] || LAYOUTS.neo;
    var navItems = buildNavItems(decision.nav_links);
    var cardsHtml = buildCardsHtml(decision.layout_style, PRODUCTS, layout.card);

    var headerMap = { logo: 'MonitorHub', nav_items: navItems };
    var heroMap = {
      headline: decision.headline,
      subheadline: decision.subheadline,
      cta_text: decision.cta_text,
      cta_link: decision.cta_link,
      hero_image: decision.hero_image,
      badge: decision.badge || ''
    };
    if (decision.layout_style === 'cyber') heroMap.headline = decision.headline;
    var stripMap = {
      strip_heading: decision.strip_heading,
      strip_subheading: decision.strip_subheading,
      strip_cta_text: decision.strip_cta_text,
      strip_cta_link: decision.strip_cta_link
    };

    try {
      var headerEl = document.getElementById(CONFIG.selectors.header);
      var heroEl = document.getElementById(CONFIG.selectors.hero);
      var sectionEl = document.getElementById(CONFIG.selectors.sectionHeading);
      var sectionSubEl = document.getElementById(CONFIG.selectors.sectionSubheading);
      var gridEl = document.getElementById(CONFIG.selectors.productGrid);
      var stripEl = document.getElementById(CONFIG.selectors.strip);
      var footerEl = document.getElementById(CONFIG.selectors.footer);

      if (headerEl) headerEl.innerHTML = applyPlaceholders(layout.header, headerMap);
      if (heroEl) heroEl.innerHTML = applyPlaceholders(layout.hero, heroMap);
      if (sectionEl) sectionEl.textContent = decision.section_heading;
      if (sectionSubEl) sectionSubEl.textContent = decision.section_subheading;
      if (gridEl) gridEl.innerHTML = cardsHtml;
      if (stripEl) stripEl.innerHTML = applyPlaceholders(layout.strip, stripMap);
      if (footerEl) footerEl.innerHTML = layout.footer;

      if (CONFIG.debug) console.log('Personalized:', decision);
      return true;
    } catch (err) {
      if (CONFIG.debug) console.warn('Personalizer inject failed:', err);
      return false;
    }
  }

  // Fullscreen loader helpers shown while personalization is in progress
  function ensureLoaderEl() {
    try {
      var id = 'personalizer-loader';
      var existing = document.getElementById(id);
      if (existing) return existing;
      var el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.display = 'none';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.background = 'rgba(0,0,0,0.6)';
      el.style.zIndex = '99999';
      el.style.backdropFilter = 'blur(4px)';
      el.innerHTML = '<div style="text-align:center;color:#fff;max-width:90%;padding:12px;"><div style="width:56px;height:56px;margin:0 auto 12px;border:4px solid rgba(255,255,255,0.15);border-top-color:#fff;border-radius:50%;animation:pf-spin 1s linear infinite"></div><div style="font-weight:700">Personalizing…</div></div>';
      var styleId = 'personalizer-loader-style';
      if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.appendChild(document.createTextNode('@keyframes pf-spin { to { transform: rotate(360deg); } }'));
        document.head.appendChild(style);
      }
      document.body.appendChild(el);
      return el;
    } catch (e) {
      if (CONFIG.debug) console.warn('Loader create failed:', e);
      return null;
    }
  }

  function showLoader() {
    try { var el = ensureLoaderEl(); if (el) el.style.display = 'flex'; } catch (e) { if (CONFIG.debug) console.warn('showLoader failed:', e); }
  }

  function hideLoader() {
    try { var el = document.getElementById('personalizer-loader'); if (el) el.style.display = 'none'; } catch (e) { if (CONFIG.debug) console.warn('hideLoader failed:', e); }
  }

  var lastDecision = null;
  var onReadyCallbacks = [];

  function run() {
    if (!CONFIG.enabled) {
      onReadyCallbacks.forEach(function (cb) { cb(); });
      return Promise.resolve();
    }
    // If configured to require a query param and none exists, skip personalization.
    try {
      var params = new URLSearchParams(window.location.search);
      var q = (params.get('q') || params.get('query') || '').trim();
      if (CONFIG.requireQuery && !q) {
        if (CONFIG.debug) console.log('Personalizer: skipping because no query present and requireQuery=true');
        onReadyCallbacks.forEach(function (cb) { cb(); });
        return Promise.resolve();
      }
    } catch (e) {
      if (CONFIG.debug) console.warn('Personalizer: query check failed', e);
    }

    // show full-screen loader while personalization runs
    try { showLoader(); } catch (e) { if (CONFIG.debug) console.warn('showLoader call failed:', e); }
    return detectIntent()
      .then(function (intentResult) {
        if (!intentResult.generatedContent && hasAIProvider() && intentResult.intent) {
          return generateCopyForIntent(intentResult.intent).then(function (gen) {
            if (gen) intentResult.generatedContent = gen;
            return intentResult;
          });
        }
        return intentResult;
      })
      .then(function (intentResult) {
        var decision = getDecision(intentResult);
        lastDecision = decision;
        inject(decision);
      })
      .catch(function (e) {
        if (CONFIG.debug) console.warn('Personalizer error:', e);
      })
      .then(function () {
        try { hideLoader(); } catch (e) { if (CONFIG.debug) console.warn('hideLoader call failed:', e); }
        onReadyCallbacks.forEach(function (cb) { cb(); });
      });
  }

  function runWithTracking() {
    run().then(function () {
      var ctaEl = document.getElementById('cta');
      if (ctaEl && !ctaEl._personalizerTracked) {
        ctaEl._personalizerTracked = true;
        ctaEl.addEventListener('click', function () {
          if (lastDecision && CONFIG.debug) console.log('Personalizer CTA click:', lastDecision.cta_text);
        });
      }
    });
  }

  if (CONFIG.autoRun) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runWithTracking);
    } else {
      runWithTracking();
    }
  }

  var personaToIntent = { buy: 'BUY_NOW', compare: 'COMPARE', explore: 'EXPLORE', budget: 'BUDGET', gaming: 'GAMING', professional: 'PROFESSIONAL', creative: 'CREATIVE', family: 'FAMILY', support: 'SUPPORT', deals: 'DEALS', usecase: 'USE_CASE' };

  window.Personalizer = {
    run: run,
    detectIntent: detectIntent,
    getDecision: getDecision,
    inject: inject,
    chatCompletion: chatCompletion,
    resolveProvider: resolveProvider,
    hasAIProvider: hasAIProvider,
    ASSETS: ASSETS,
    CONFIG: CONFIG,
    LAYOUTS: LAYOUTS,
    PRODUCTS: PRODUCTS,
    VALID_INTENTS: VALID_INTENTS,
    onReady: function (cb) { if (typeof cb === 'function') onReadyCallbacks.push(cb); },
    init: function (opts) {
      try {
        if (!opts || typeof opts !== 'object') opts = {};
        if (opts.selectors && typeof opts.selectors === 'object') {
          Object.keys(opts.selectors).forEach(function (k) { if (opts.selectors[k]) CONFIG.selectors[k] = opts.selectors[k]; });
        }
        if (typeof opts.requireQuery === 'boolean') CONFIG.requireQuery = !!opts.requireQuery;
        if (typeof opts.autoRun === 'boolean') CONFIG.autoRun = !!opts.autoRun;
        if (typeof opts.debug === 'boolean') CONFIG.debug = !!opts.debug;
        if (opts.assetBase) CONFIG.assetBase = opts.assetBase;
        if (opts.openaiApiKey) {
          if (typeof window.PersonalizerConfig !== 'object') window.PersonalizerConfig = {};
          window.PersonalizerConfig.openaiApiKey = opts.openaiApiKey;
        }
        if (opts.openrouterApiKey) {
          if (typeof window.PersonalizerConfig !== 'object') window.PersonalizerConfig = {};
          window.PersonalizerConfig.openrouterApiKey = opts.openrouterApiKey;
        }
        if (opts.openrouterBaseUrl) {
          if (typeof window.PersonalizerConfig !== 'object') window.PersonalizerConfig = {};
          window.PersonalizerConfig.openrouterBaseUrl = opts.openrouterBaseUrl;
        }
        if (opts.openrouterModel) {
          if (typeof window.PersonalizerConfig !== 'object') window.PersonalizerConfig = {};
          window.PersonalizerConfig.openrouterModel = opts.openrouterModel;
        }
        if (CONFIG.autoRun) {
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runWithTracking);
          else runWithTracking();
        }
      } catch (e) { if (CONFIG.debug) console.warn('Personalizer.init failed:', e); }
    },
    simulate: function (persona) {
      var intent = personaToIntent[persona] || 'DEFAULT';
      var self = this;
      generateCopyForIntent(intent).then(function (gen) {
        var decision = getDecision({ intent: intent, signals: ['simulate:' + persona], generatedContent: gen || null });
        lastDecision = decision;
        inject(decision);
        if (CONFIG.debug) console.log('Personalizer simulate:', persona, decision);
      }).catch(function () {
        var decision = getDecision({ intent: intent, signals: ['simulate:' + persona] });
        lastDecision = decision;
        inject(decision);
      });
    }
  };
  Object.defineProperty(window.Personalizer, 'lastDecision', { get: function () { return lastDecision; }, configurable: true });
})();
