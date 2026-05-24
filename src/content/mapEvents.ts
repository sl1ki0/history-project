/**
 * Геопривязка событий 1991–2022 для интерактивной карты России.
 *
 * Координаты `x`/`y` — это внутренняя система координат SVG-карты
 * (viewBox 0 0 1000 480), а не реальные градусы. Они согласованы с упрощённым
 * контуром страны в `components/map/RussiaMap.tsx`: один и тот же viewBox
 * используется и для контура, и для маркеров.
 */

export type MapCategory =
  | 'politics'
  | 'economy'
  | 'military'
  | 'culture'
  | 'infrastructure'

export interface MapEvent {
  id: string
  /** Точка на SVG-карте (см. RussiaMap.tsx, viewBox 0 0 1000 480) */
  x: number
  y: number
  /** Город или регион — отображается на карточке и при зуме */
  location: string
  /** Год или диапазон лет — используется фильтром-таймлайном */
  year: string
  /** Числовое значение года (или начала диапазона) — для таймлайна */
  yearStart: number
  /** Конец диапазона; для одиночных событий совпадает с yearStart */
  yearEnd: number
  /** К какому залу относится точка (1 / 2 / 3) */
  excursionId: 1 | 2 | 3
  /** ID конкретной остановки, если событие точно из неё */
  stopId?: string
  /** Заголовок события для карточки и aria-label */
  title: string
  /** 2–4 предложения о сути события */
  summary: string
  category: MapCategory
  /** Номера источников из соответствующей `excursion.sources` */
  sourceRefs: number[]
  /**
   * Точка находится вне границ современной РФ
   * (Беловежская пуща, Цхинвал) — рисуем выноску-стрелку к контуру.
   */
  external?: boolean
}

export const CATEGORY_META: Record<
  MapCategory,
  { label: string; color: string; ring: string; glow: string }
> = {
  politics: {
    label: 'Политика',
    color: '#3b82f6',
    ring: 'rgba(59,130,246,0.45)',
    glow: 'rgba(59,130,246,0.55)',
  },
  economy: {
    label: 'Экономика',
    color: '#22c55e',
    ring: 'rgba(34,197,94,0.45)',
    glow: 'rgba(34,197,94,0.55)',
  },
  military: {
    label: 'Военные конфликты',
    color: '#ef4444',
    ring: 'rgba(239,68,68,0.45)',
    glow: 'rgba(239,68,68,0.55)',
  },
  culture: {
    label: 'Культура',
    color: '#a855f7',
    ring: 'rgba(168,85,247,0.45)',
    glow: 'rgba(168,85,247,0.55)',
  },
  infrastructure: {
    label: 'Инфраструктура',
    color: '#f59e0b',
    ring: 'rgba(245,158,11,0.45)',
    glow: 'rgba(245,158,11,0.55)',
  },
}

/** Карточка зала — нужна фильтру по периодам */
export const EXCURSION_META: Record<1 | 2 | 3, { period: string; title: string }> = {
  1: { period: '1991–1999', title: 'Становление' },
  2: { period: '2000–2008', title: 'Стабилизация' },
  3: { period: '2008–2022', title: 'Новый миропорядок' },
}

/**
 * События распределены по 17 точкам. Чтобы маркеры из одного города (Москва)
 * не накладывались друг на друга, им даны микро-смещения внутри одного
 * «городского квартала». При низком зуме они группируются в кластер.
 */
export const mapEvents: MapEvent[] = [
  /* ───────────── Зал 1 — 1991–1999 ───────────── */
  {
    id: 'evt-putch-1991',
    x: 102,
    y: 276,
    location: 'Москва · Белый дом',
    year: '19–21 августа 1991',
    yearStart: 1991,
    yearEnd: 1991,
    excursionId: 1,
    title: 'Августовский путч',
    summary:
      'ГКЧП объявил о введении ЧП и изоляции М. Горбачёва. Белый дом — резиденция Верховного Совета РСФСР — стал символом сопротивления. Уже 21 августа путч был подавлен, что предопределило ускоренный распад СССР.',
    category: 'politics',
    sourceRefs: [3],
  },
  {
    id: 'evt-belavezha',
    x: 28,
    y: 316,
    location: 'Беловежская пуща · Вискули',
    year: '8 декабря 1991',
    yearStart: 1991,
    yearEnd: 1991,
    excursionId: 1,
    stopId: '1-belavezha',
    title: 'Беловежские соглашения',
    summary:
      'Б. Ельцин, Л. Кравчук и С. Шушкевич подписали Соглашение о создании СНГ. Преамбула констатировала прекращение существования СССР как субъекта международного права.',
    category: 'politics',
    sourceRefs: [1, 2, 3],
    external: true,
  },
  {
    id: 'evt-shock-1992',
    x: 108,
    y: 280,
    location: 'Москва · Кремль',
    year: '2 января 1992',
    yearStart: 1992,
    yearEnd: 1992,
    excursionId: 1,
    stopId: '2-shock',
    title: '«Шоковая терапия»',
    summary:
      'Вступил в силу Указ № 297 «О мерах по либерализации цен»: отпущены 80 % оптовых и 90 % розничных цен. К концу года инфляция достигла 2 508 %, но дефицит был ликвидирован.',
    category: 'economy',
    sourceRefs: [4, 5, 6],
  },
  {
    id: 'evt-constitution-1993',
    x: 112,
    y: 273,
    location: 'Москва · Дом Советов',
    year: 'сентябрь–декабрь 1993',
    yearStart: 1993,
    yearEnd: 1993,
    excursionId: 1,
    stopId: '3-constitution',
    title: 'Кризис 1993 и Конституция',
    summary:
      'Указ № 1400 о роспуске Съезда народных депутатов перерос в вооружённое противостояние 3–4 октября. 12 декабря всенародным голосованием принята действующая Конституция РФ.',
    category: 'politics',
    sourceRefs: [8, 9, 10],
  },
  {
    id: 'evt-grozny-1994',
    x: 152,
    y: 434,
    location: 'Грозный',
    year: '1994–1996',
    yearStart: 1994,
    yearEnd: 1996,
    excursionId: 1,
    stopId: '4-chechnya',
    title: 'Первая чеченская кампания',
    summary:
      'Войска вошли в Чечню 11 декабря 1994 года. Новогодний штурм Грозного, бои за город, теракты в Будённовске и Кизляре. 31 августа 1996 — Хасавюртовские соглашения.',
    category: 'military',
    sourceRefs: [11, 12, 13],
  },
  {
    id: 'evt-elections-1996',
    x: 100,
    y: 284,
    location: 'Москва',
    year: '16 июня — 3 июля 1996',
    yearStart: 1996,
    yearEnd: 1996,
    excursionId: 1,
    title: 'Президентские выборы 1996',
    summary:
      'Б. Ельцин переизбран во втором туре с результатом 53,8 % против 40,3 % у Г. Зюганова при явке 68,9 %. Первые конкурентные выборы Президента РФ.',
    category: 'politics',
    sourceRefs: [7],
  },
  {
    id: 'evt-default-1998',
    x: 116,
    y: 281,
    location: 'Москва · ЦБ РФ',
    year: '17 августа 1998',
    yearStart: 1998,
    yearEnd: 1998,
    excursionId: 1,
    stopId: '5-default',
    title: 'Дефолт по ГКО',
    summary:
      'Правительство С. Кириенко и Центробанк объявили технический дефолт по ГКО и отказ от валютного коридора. Курс доллара за полгода вырос с 6 до 21 рубля.',
    category: 'economy',
    sourceRefs: [14, 15],
  },

  /* ───────────── Зал 2 — 2000–2008 ───────────── */
  {
    id: 'evt-putin-2000',
    x: 106,
    y: 271,
    location: 'Москва · Кремль',
    year: '7 мая 2000',
    yearStart: 2000,
    yearEnd: 2000,
    excursionId: 2,
    stopId: '1-power-vertical',
    title: 'Инаугурация В. Путина',
    summary:
      'Вступление в должность Президента и подписание Указа № 849 о семи федеральных округах — старт «вертикали власти».',
    category: 'politics',
    sourceRefs: [1],
  },
  {
    id: 'evt-tax-flat-2001',
    x: 114,
    y: 268,
    location: 'Москва · Минфин',
    year: '1 января 2001',
    yearStart: 2001,
    yearEnd: 2004,
    excursionId: 2,
    stopId: '2-tax-reform',
    title: 'Плоская шкала 13 %',
    summary:
      'Введена единая ставка НДФЛ 13 % (глава 23 НК РФ). Поступления по НДФЛ за четыре года выросли почти втрое; в 2004 создан Стабилизационный фонд.',
    category: 'economy',
    sourceRefs: [2, 3, 4],
  },
  {
    id: 'evt-dubrovka-2002',
    x: 110,
    y: 285,
    location: 'Москва · «Норд-Ост»',
    year: '23–26 октября 2002',
    yearStart: 2002,
    yearEnd: 2002,
    excursionId: 2,
    stopId: '3-terror',
    title: 'Захват ДК на Дубровке',
    summary:
      'Группа М. Бараева удерживала ≈ 916 заложников на мюзикле «Норд-Ост». Освобождение здания усыпляющим газом; по официальным данным погибли 130 заложников.',
    category: 'military',
    sourceRefs: [8],
  },
  {
    id: 'evt-beslan-2004',
    x: 146,
    y: 437,
    location: 'Беслан · Северная Осетия',
    year: '1–3 сентября 2004',
    yearStart: 2004,
    yearEnd: 2004,
    excursionId: 2,
    stopId: '3-terror',
    title: 'Трагедия в Беслане',
    summary:
      'Захват школы № 1 в первый день учебного года. Удерживались более 1 100 человек, в основном детей. Погибли 334 человека, из них 186 — дети.',
    category: 'military',
    sourceRefs: [9, 10],
  },
  {
    id: 'evt-sakhalin-oil',
    x: 706,
    y: 340,
    location: 'Сахалин · шельфовые проекты',
    year: '2000-е',
    yearStart: 2003,
    yearEnd: 2008,
    excursionId: 2,
    title: 'Нефтегазовый рост',
    summary:
      'Запуск «Сахалин-1» и «Сахалин-2», экспортных трубопроводов и СПГ-завода. Сырьевая рента стала источником пополнения Стабилизационного фонда и удвоения ВВП.',
    category: 'economy',
    sourceRefs: [5, 6],
  },
  {
    id: 'evt-08-08-08',
    x: 142,
    y: 478,
    location: 'Цхинвал · Южная Осетия',
    year: '8–12 августа 2008',
    yearStart: 2008,
    yearEnd: 2008,
    excursionId: 2,
    stopId: '4-medvedev-08',
    title: 'Пятидневная война',
    summary:
      'Операция по принуждению Грузии к миру после обстрела Цхинвала. 26 августа Россия признала независимость Южной Осетии и Абхазии.',
    category: 'military',
    sourceRefs: [11, 12],
    external: true,
  },

  /* ───────────── Зал 3 — 2008–2022 ───────────── */
  {
    id: 'evt-bolotnaya-2011',
    x: 100,
    y: 277,
    location: 'Москва · Болотная площадь',
    year: '2011–2012',
    yearStart: 2011,
    yearEnd: 2012,
    excursionId: 3,
    title: 'Массовые протесты',
    summary:
      'Серия митингов «За честные выборы» после думских выборов декабря 2011 года. Крупнейшие акции — на Болотной площади и проспекте Сахарова собрали десятки тысяч участников.',
    category: 'politics',
    sourceRefs: [6],
  },
  {
    id: 'evt-sochi-2014',
    x: 120,
    y: 425,
    location: 'Сочи',
    year: '7–23 февраля 2014',
    yearStart: 2014,
    yearEnd: 2014,
    excursionId: 3,
    stopId: '1-sochi',
    title: 'XXII зимние Олимпийские игры',
    summary:
      'Россия впервые приняла зимнюю Олимпиаду. Сборная — первое место в общем зачёте (13 золотых медалей). К Играм построены «Фишт», ледовый дворец «Большой», Сочинский кластер.',
    category: 'culture',
    sourceRefs: [1, 2],
  },
  {
    id: 'evt-crimea-2014',
    x: 85,
    y: 412,
    location: 'Симферополь · Крым',
    year: '16–21 марта 2014',
    yearStart: 2014,
    yearEnd: 2014,
    excursionId: 3,
    stopId: '2-crimea',
    title: 'Референдум и присоединение Крыма',
    summary:
      'По официальным итогам референдума 96,77 % высказались за вхождение в состав РФ. 18 марта подписан договор, 21 марта — ФКЗ № 6-ФКЗ о принятии Крыма и Севастополя.',
    category: 'politics',
    sourceRefs: [3, 4, 5],
  },
  {
    id: 'evt-constitution-2020',
    x: 112,
    y: 268,
    location: 'Москва · Кремль',
    year: '1 июля 2020',
    yearStart: 2020,
    yearEnd: 2020,
    excursionId: 3,
    stopId: '5-covid-const',
    title: 'Конституционные поправки',
    summary:
      'Общероссийское голосование одобрило поправки в 22 статьи Конституции. Изменены сроки президентских полномочий, закреплены социальные гарантии и приоритет российского права.',
    category: 'politics',
    sourceRefs: [11],
  },
  {
    id: 'evt-covid-2020',
    x: 106,
    y: 281,
    location: 'Москва · локдаун',
    year: 'март 2020 — 2021',
    yearStart: 2020,
    yearEnd: 2021,
    excursionId: 3,
    stopId: '5-covid-const',
    title: 'Пандемия COVID-19 и «Спутник V»',
    summary:
      '30 марта 2020 — начало нерабочих дней по всей стране. 11 августа 2020 зарегистрирована первая в мире вакцина против COVID-19 — «Спутник V» (Гам-КОВИД-Вак).',
    category: 'infrastructure',
    sourceRefs: [10],
  },
  {
    id: 'evt-syria-2015',
    x: 75,
    y: 478,
    location: 'Хмеймим · Латакия, Сирия',
    year: '30 сентября 2015',
    yearStart: 2015,
    yearEnd: 2017,
    excursionId: 3,
    stopId: '3-syria',
    title: 'Операция ВКС России в Сирии',
    summary:
      'Начало авиаударов по позициям ИГИЛ (запрещена в РФ) с авиабазы Хмеймим. К декабрю 2017 года основные задачи операции выполнены.',
    category: 'military',
    sourceRefs: [6, 7],
    external: true,
  },
  {
    id: 'evt-wc2018',
    x: 104,
    y: 278,
    location: 'Москва · Лужники',
    year: '14 июня — 15 июля 2018',
    yearStart: 2018,
    yearEnd: 2018,
    excursionId: 3,
    stopId: '4-football',
    title: 'Чемпионат мира по футболу 2018',
    summary:
      '11 городов, 12 стадионов, 64 матча. Сборная России впервые вышла в четвертьфинал. Турнир посетили около 5 миллионов человек.',
    category: 'culture',
    sourceRefs: [8, 9],
  },
  {
    id: 'evt-svo-2022',
    x: 114,
    y: 272,
    location: 'Москва · Кремль',
    year: '24 февраля 2022',
    yearStart: 2022,
    yearEnd: 2022,
    excursionId: 3,
    stopId: '6-svo',
    title: 'Начало специальной военной операции',
    summary:
      'Президент объявил о начале СВО на Украине. 30 сентября подписаны договоры о принятии в состав РФ четырёх новых субъектов.',
    category: 'military',
    sourceRefs: [12, 13, 14],
  },
]

/* ─────────── Вспомогательные функции ─────────── */

export function getYearsRange(): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const e of mapEvents) {
    if (e.yearStart < min) min = e.yearStart
    if (e.yearEnd > max) max = e.yearEnd
  }
  return { min, max }
}
