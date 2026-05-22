/**
 * Russian text normalizer for TTS engines (Piper VITS, Web Speech).
 *
 * Most off-the-shelf TTS models read numerals digit-by-digit
 * ("1991" → "один девять девять один"). This module turns numbers,
 * percents, ordinals and punctuation into spoken Russian words so the
 * narrator sounds natural.
 *
 * Scope is deliberately narrow: we cover the cases that actually appear in
 * the museum content — years, counts up to ~999 999, percents with optional
 * decimal point, dates ("8 декабря 1991"), the № sign, the «≈» symbol and
 * em-dashes. Cases not covered fall back to digit-by-digit pronunciation,
 * which is no worse than the original behaviour.
 */

const UNITS_M = [
  '', 'один', 'два', 'три', 'четыре', 'пять',
  'шесть', 'семь', 'восемь', 'девять',
]
const UNITS_F = [
  '', 'одна', 'две', 'три', 'четыре', 'пять',
  'шесть', 'семь', 'восемь', 'девять',
]
const TEENS = [
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать',
  'четырнадцать', 'пятнадцать', 'шестнадцать',
  'семнадцать', 'восемнадцать', 'девятнадцать',
]
const TENS = [
  '', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят',
  'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто',
]
const HUNDREDS = [
  '', 'сто', 'двести', 'триста', 'четыреста',
  'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот',
]

/** Ordinal genitive of single digits 0–9: «первого», «второго», … */
const ORDINAL_GEN_UNITS = [
  '', 'первого', 'второго', 'третьего', 'четвёртого', 'пятого',
  'шестого', 'седьмого', 'восьмого', 'девятого',
]
/** Ordinal genitive of teens 10–19 */
const ORDINAL_GEN_TEENS = [
  'десятого', 'одиннадцатого', 'двенадцатого', 'тринадцатого',
  'четырнадцатого', 'пятнадцатого', 'шестнадцатого',
  'семнадцатого', 'восемнадцатого', 'девятнадцатого',
]
/** Ordinal genitive of round tens 20…90 */
const ORDINAL_GEN_TENS = [
  '', '', 'двадцатого', 'тридцатого', 'сорокового', 'пятидесятого',
  'шестидесятого', 'семидесятого', 'восьмидесятого', 'девяностого',
]

const MONTHS_GEN: Record<string, string> = {
  января: 'января',
  февраля: 'февраля',
  марта: 'марта',
  апреля: 'апреля',
  мая: 'мая',
  июня: 'июня',
  июля: 'июля',
  августа: 'августа',
  сентября: 'сентября',
  октября: 'октября',
  ноября: 'ноября',
  декабря: 'декабря',
}

const MONTHS_RE = 'января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря'

/* ─────────────── 0…999 ─────────────── */

function tripletToWords(n: number, feminine = false): string {
  if (n === 0) return ''
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const u = n % 10
  if (h) parts.push(HUNDREDS[h])
  if (t === 1) {
    parts.push(TEENS[u])
  } else {
    if (t) parts.push(TENS[t])
    if (u) parts.push(feminine ? UNITS_F[u] : UNITS_M[u])
  }
  return parts.join(' ')
}

/* ─────────────── plural form picker ─────────────── */

function pluralForm(n: number, [one, few, many]: [string, string, string]) {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

/* ─────────────── integer to Russian (cardinal, masculine) ─────────────── */

export function numberToRussianWords(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (n === 0) return 'ноль'
  if (n < 0) return 'минус ' + numberToRussianWords(-n)

  const out: string[] = []

  const millions = Math.floor(n / 1_000_000)
  n = n % 1_000_000
  if (millions) {
    out.push(
      tripletToWords(millions) + ' ' +
        pluralForm(millions, ['миллион', 'миллиона', 'миллионов']),
    )
  }

  const thousands = Math.floor(n / 1000)
  n = n % 1000
  if (thousands) {
    out.push(
      tripletToWords(thousands, /* feminine */ true) + ' ' +
        pluralForm(thousands, ['тысяча', 'тысячи', 'тысяч']),
    )
  }

  if (n) out.push(tripletToWords(n))

  return out.join(' ').replace(/\s+/g, ' ').trim()
}

/* ─────────────── year reader ─────────────── */

/**
 * Convert a 4-digit year (e.g. 1991, 2014) into its full Russian spelling.
 *   nom (default): «тысяча девятьсот девяносто один»
 *   gen:           «тысяча девятьсот девяносто первого»
 * Outside the 1000–2999 range we fall back to plain numberToRussianWords.
 */
export function yearToRussianWords(
  year: number,
  gcase: 'nom' | 'gen' = 'nom',
): string {
  if (year < 1000 || year >= 3000) return numberToRussianWords(year)
  const thousands = Math.floor(year / 1000)
  const rest = year % 1000

  let prefix: string
  if (thousands === 1) prefix = 'тысяча'
  else if (thousands === 2) prefix = 'две тысячи'
  else prefix = numberToRussianWords(thousands) + ' тысяч'

  if (rest === 0) return prefix

  if (gcase === 'nom') {
    return `${prefix} ${tripletToWords(rest)}`
  }

  // Genitive form — shift only the trailing piece to ordinal genitive.
  const h = Math.floor(rest / 100)
  const t = Math.floor((rest % 100) / 10)
  const u = rest % 10
  const parts: string[] = []
  if (h) parts.push(HUNDREDS[h])
  if (t === 1) {
    parts.push(ORDINAL_GEN_TEENS[u])
  } else if (t && u === 0) {
    parts.push(ORDINAL_GEN_TENS[t])
  } else {
    if (t) parts.push(TENS[t])
    if (u) parts.push(ORDINAL_GEN_UNITS[u])
  }
  return `${prefix} ${parts.join(' ')}`
}

/** Day of month 1..31 as masculine genitive ordinal ("восьмого", "двадцать первого"). */
function dayToOrdinalGen(day: number): string {
  if (day < 1 || day > 31) return numberToRussianWords(day)
  if (day < 10) return ORDINAL_GEN_UNITS[day]
  if (day < 20) return ORDINAL_GEN_TEENS[day - 10]
  if (day === 20) return 'двадцатого'
  if (day === 30) return 'тридцатого'
  const t = Math.floor(day / 10)
  const u = day % 10
  return `${TENS[t]} ${ORDINAL_GEN_UNITS[u]}`
}

/** Strip Unicode whitespace inside numbers («3 500» → «3500», incl. NBSP/thin space). */
function stripThousandSep(s: string): string {
  return s.replace(/(\d)[   \s](?=\d{3}\b)/g, '$1')
}

/* ─────────────── master normalizer ─────────────── */

/** Multi-letter abbreviations that engines often mangle — spell them out. */
const ABBR_MAP: Record<string, string> = {
  СССР: 'эс-эс-эс-эр',
  РСФСР: 'эр-эс-эф-эс-эр',
  РФ: 'эр-эф',
  СНГ: 'эс-эн-гэ',
  США: 'сэ-шэ-а',
  ООН: 'оо́н',
  НАТО: 'на́то',
  ЕС: 'е-эс',
  ВВП: 'вэ-вэ-пэ',
  ЦБ: 'цэ-бэ',
  МВД: 'эм-вэ-дэ',
  ФСБ: 'эф-эс-бэ',
  МВФ: 'эм-вэ-эф',
  ВТО: 'вэ-тэ-о',
}

export function normalizeForTTS(input: string): string {
  let text = input

  // 1) Strip footnote markers like [12]
  text = text.replace(/\[\d+\]/g, '')

  // 1a) Expand well-known multi-letter abbreviations so engines don't read them as one word
  for (const [abbr, spelled] of Object.entries(ABBR_MAP)) {
    text = text.replace(new RegExp(`\\b${abbr}\\b`, 'g'), spelled)
  }

  // 1b) Common date / measure short forms: "1991 г.", "1992–1999 гг."
  text = text.replace(/\bгг\./g, 'годы')
  text = text.replace(/(\d{4})\s*г\./g, '$1 года')
  text = text.replace(/\bтыс\./g, 'тысяч')
  text = text.replace(/\bмлн\.?/g, 'миллионов')
  text = text.replace(/\bмлрд\.?/g, 'миллиардов')

  // 1c) Initials "Б. Н. Ельцин" — drop the dots so engines don't pause/abort each letter
  text = text.replace(/\b([А-ЯЁ])\.\s*([А-ЯЁ])\.\s*([А-ЯЁ][а-яё]+)/g, '$1 $2 $3')
  text = text.replace(/\b([А-ЯЁ])\.\s*([А-ЯЁ][а-яё]+)/g, '$1 $2')

  // 2) Symbol words (keep dashes for now — they help distinguish ranges)
  text = text.replace(/≈/g, 'примерно ')
  text = text.replace(/№\s*/g, 'номер ')
  text = text.replace(/\.{2,}/g, '.')

  // 3) Compact thousand separators so later rules see clean integers.
  //    Two passes catch chained groups like "1 234 567".
  text = stripThousandSep(text)
  text = stripThousandSep(text)

  // 4) Day-range dates: «7–23 февраля 2014» → «с седьмого по двадцать третье февраля две тысячи четырнадцатого года»
  text = text.replace(
    new RegExp(
      `(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s+(${MONTHS_RE})(?:\\s+(\\d{4}))?`,
      'gi',
    ),
    (_m, d1: string, d2: string, monthStr: string, yearStr?: string) => {
      const day1 = parseInt(d1, 10)
      const day2 = parseInt(d2, 10)
      const month = MONTHS_GEN[monthStr.toLowerCase()] || monthStr
      const head = `с ${dayToOrdinalGen(day1)} по ${dayToOrdinalGen(day2)} ${month}`
      if (!yearStr) return head
      return `${head} ${yearToRussianWords(parseInt(yearStr, 10), 'gen')}`
    },
  )

  // 5) Single-day dates: «8 декабря 1991 года» → «восьмого декабря тысяча девятьсот девяносто первого года»
  text = text.replace(
    new RegExp(`(\\d{1,2})\\s+(${MONTHS_RE})(?:\\s+(\\d{4}))?`, 'gi'),
    (_m, dayStr: string, monthStr: string, yearStr?: string) => {
      const day = parseInt(dayStr, 10)
      const month = MONTHS_GEN[monthStr.toLowerCase()] || monthStr
      if (!yearStr) return `${dayToOrdinalGen(day)} ${month}`
      const year = parseInt(yearStr, 10)
      return `${dayToOrdinalGen(day)} ${month} ${yearToRussianWords(year, 'gen')}`
    },
  )

  // 6) Year ranges «1994-1996» → «с 1994 по 1996»
  text = text.replace(/(\d{4})\s*[-–—]\s*(\d{4})/g, 'с $1 по $2')

  // 7) Generic numeric ranges «5-10» → «от 5 до 10»
  text = text.replace(/(\d+)\s*[-–—]\s*(\d+)/g, 'от $1 до $2')

  // 8) Remaining dashes → spoken pause
  text = text.replace(/[—–]/g, ', ')

  // 9) Standalone 4-digit years (after dates / ranges are handled)
  text = text.replace(/\b(1[89]\d{2}|20\d{2}|21\d{2})\b/g, (m) =>
    yearToRussianWords(parseInt(m, 10)),
  )

  // 10) Percentages: «58,43 %» → «пятьдесят восемь целых сорок три процента»
  text = text.replace(/(\d+)(?:[,.](\d+))?\s*%/g, (_m, intPart, fracPart) => {
    const intN = parseInt(intPart, 10)
    const word = numberToRussianWords(intN)
    const procForm = pluralForm(intN, ['процент', 'процента', 'процентов'])
    if (fracPart) {
      return `${word} целых ${numberToRussianWords(parseInt(fracPart, 10))} ${procForm}`
    }
    return `${word} ${procForm}`
  })

  // 11) Plain decimal numbers between digits: «3,8» → «три целых восемь»
  text = text.replace(/(\d+),(\d+)/g, (_m, a, b) => {
    const left = numberToRussianWords(parseInt(a, 10))
    const right = numberToRussianWords(parseInt(b, 10))
    return `${left} целых ${right}`
  })

  // 12) Any remaining standalone integers
  text = text.replace(/\b\d+\b/g, (m) => {
    const n = parseInt(m, 10)
    if (n > 9_999_999) return m
    return numberToRussianWords(n)
  })

  // 13) Tidy whitespace & punctuation: collapse spaces, push commas/colons
  //     against the preceding word, ensure a single space after them.
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;:])(?=\S)/g, '$1 ')
    .trim()

  return text
}
