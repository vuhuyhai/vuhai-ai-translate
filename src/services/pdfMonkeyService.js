// PDFMonkey API integration
// Docs: https://docs.pdfmonkey.io/references/api/documents
// HTML output follows TCVN 5709:2009 semantic structure

const PDFMONKEY_BASE = 'https://api.pdfmonkey.io/api/v1'

// ── ENV CONFIG ──

function getConfig() {
  const apiKey = import.meta.env.VITE_PDFMONKEY_API_KEY
  const templateId = import.meta.env.VITE_PDFMONKEY_TEMPLATE_ID

  if (!apiKey) {
    throw new Error(
      'VITE_PDFMONKEY_API_KEY chưa được set trong .env.local\n' +
      'Restart dev server sau khi thêm biến.'
    )
  }
  if (!templateId) {
    throw new Error(
      'VITE_PDFMONKEY_TEMPLATE_ID chưa được set trong .env.local\n' +
      'Lấy Template ID từ pdfmonkey.io → Templates → copy ID.'
    )
  }
  return { apiKey, templateId }
}

// ── INLINE FORMAT: markdown → HTML (bold, italic, code, strikethrough) ──

function inlineFormat(s) {
  if (!s) return ''
  // Escape & first (but not already-escaped entities)
  s = s.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/gi, '&amp;')
  // Bold+Italic ***
  s = s.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // Bold **
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  // Italic * (not at line start, not bullet)
  s = s.replace(/(?<=\S)\*([^*\n]+?)\*(?=\S)/g, '<em>$1</em>')
  // Code `
  s = s.replace(/`([^`\n]+?)`/g, '<code>$1</code>')
  // Strikethrough ~~
  s = s.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')
  return s
}

// ── BLOCKQUOTE PARSER: handles single-line "> content > > – Author" ──

function parseBlockquoteLine(text) {
  const t = text.trim()
  // Pattern: "> content > > – Author" or "> content >> – Author"
  const singleLineAttr = t.match(/^>\s+(.+?)\s*>+\s*[–—-]\s*(.+)$/)
  if (singleLineAttr) {
    return { paras: [singleLineAttr[1].trim()], attribution: singleLineAttr[2].trim() }
  }
  // Pattern: "> content" (no attribution)
  const singleLine = t.match(/^>\s+(.+)$/)
  if (singleLine) {
    return { paras: [singleLine[1].trim()], attribution: null }
  }
  return null
}

// ── TEXT TO HTML ──
// Converts markdown text to semantic HTML.
// Single newlines within a paragraph → <br/> (preserves line breaks as in the app).
// Blank lines → separate <p> blocks.

function isBlockStart(line) {
  return /^#{1,4}\s/.test(line) ||
    /^[-•*]\s/.test(line) ||
    /^\d+[.)]\s/.test(line) ||
    /^>/.test(line) ||
    /^[-*_]{3,}\s*$/.test(line)
}

function textToHtml(text) {
  if (!text?.trim()) return ''

  const lines = text.trim().split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Blank line — skip (acts as paragraph separator)
    if (!line) { i++; continue }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      out.push('<hr>')
      i++; continue
    }

    // Heading — preserve full hierarchy (h1–h4)
    const hm = line.match(/^(#{1,4})\s+(.+)$/)
    if (hm) {
      const lvl = Math.min(hm[1].length, 4)
      const tag = `h${lvl}`
      out.push(`<${tag}>${inlineFormat(hm[2])}</${tag}>`)
      i++; continue
    }

    // ── Blockquote ──
    if (/^>/.test(line)) {
      const rawLines = []
      while (i < lines.length && /^>/.test(lines[i].trim())) {
        rawLines.push(lines[i].trim())
        i++
      }
      const fullText = rawLines.join(' ')
      const parsed = parseBlockquoteLine(fullText)
      let inner = ''
      if (parsed) {
        inner = parsed.paras
          .filter(p => p.trim())
          .map(p => `<p>${inlineFormat(p)}</p>`)
          .join('')
        if (parsed.attribution) {
          inner += `<cite>— ${inlineFormat(parsed.attribution)}</cite>`
        }
      } else {
        const stripped = fullText.replace(/^>+\s*/gm, '').trim()
        inner = `<p>${inlineFormat(stripped)}</p>`
      }
      out.push(`<blockquote>${inner}</blockquote>`)
      continue
    }

    // ── Bullet list ──
    if (/^[-•*]\s/.test(line)) {
      const items = []
      while (i < lines.length) {
        const lt = lines[i].trim()
        if (!lt) { i++; break }
        if (!/^[-•*]\s/.test(lt)) break
        items.push(`<li>${inlineFormat(lt.replace(/^[-•*]\s+/, ''))}</li>`)
        i++
      }
      if (items.length) out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // ── Numbered list ──
    if (/^\d+[.)]\s/.test(line)) {
      const items = []
      while (i < lines.length) {
        const lt = lines[i].trim()
        if (!lt) { i++; break }
        if (!/^\d+[.)]\s/.test(lt)) break
        items.push(`<li>${inlineFormat(lt.replace(/^\d+[.)]\s+/, ''))}</li>`)
        i++
      }
      if (items.length) out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    // ── Paragraph — each single newline becomes <br/> ──
    const plines = []
    while (i < lines.length) {
      const lt = lines[i].trim()
      if (!lt) { i++; break }       // blank line = end of paragraph
      if (isBlockStart(lt)) break    // next block element = end of paragraph
      plines.push(inlineFormat(lt))
      i++
    }
    if (plines.length) {
      out.push(`<p>${plines.join('<br/>')}</p>`)
    }
  }

  return out.join('\n') || ''
}

// ── BUILD PAYLOAD ──

function buildPayload(sections, config) {
  const {
    title = 'Bản dịch',
    author = '',
    organization = '',
    topic = 'general',
    glossary = [],
  } = config

  const doneSections = (sections || []).filter(s =>
    s.status === 'done' || s.translatedText
  )

  if (doneSections.length === 0) {
    throw new Error('Không có đoạn nào đã dịch xong để xuất PDF.')
  }

  const totalWords = doneSections.reduce((sum, s) => {
    const text = s.harmonizedText || s.cleanedText || s.translatedText || ''
    return sum + text.split(/\s+/).filter(Boolean).length
  }, 0)

  const formattedSections = doneSections.map((s, idx) => {
    const rawText = s.harmonizedText || s.cleanedText || s.translatedText || ''

    let sectionTitle = ''
    const t = (s.title || '').trim()
    if (
      t &&
      !/^(Phần|Section|Part|Đoạn)\s+\d+/i.test(t) &&
      !/Trang\s+\d+/i.test(t) &&
      t.length < 120
    ) {
      sectionTitle = t
    }

    return {
      index: idx + 1,
      title: sectionTitle,
      html_content: textToHtml(rawText),
      word_count: rawText.split(/\s+/).filter(Boolean).length,
    }
  })

  const cleanTitle = (title || 'Bản dịch').replace('.pdf', '').replace('.url', '')
  const date = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const payload = {
    document_title: cleanTitle,
    author: author || '',
    organization: organization || '',
    translated_date: date,
    total_sections: doneSections.length,
    total_words: totalWords.toLocaleString('vi-VN'),
    topic,
    language: 'vi',
    standard: 'TCVN',
    sections: formattedSections,
    glossary: (glossary || []).slice(0, 50).map(g => ({
      termEN: (g.termEN || g.en || '').trim(),
      termVI: (g.termVI || g.vi || '').trim(),
      notes: (g.notes || '').trim(),
    })).filter(g => g.termEN && g.termVI),
  }

  console.log('[PDFMonkey] Payload built:', {
    sections: payload.sections.length,
    glossaryTerms: payload.glossary.length,
    totalWords: payload.total_words,
  })

  return payload
}

// ── CREATE DOCUMENT ──

async function createDocument(payload, apiKey, templateId) {
  const cleanTitle = (payload.document_title || 'ban-dich')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .slice(0, 60) || 'ban-dich'

  const body = {
    document: {
      document_template_id: templateId,
      status: 'pending',
      payload,
      meta: {
        _filename: cleanTitle + '.pdf',
        source: 'vuhai-ai-translate',
      },
    },
  }

  console.log('[PDFMonkey] Creating document...', { templateId, filename: cleanTitle + '.pdf' })

  const res = await fetch(PDFMONKEY_BASE + '/documents', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    console.error('[PDFMonkey] Create failed:', res.status, data)
    const msg = Array.isArray(data?.errors)
      ? data.errors.join(', ')
      : data?.error || 'HTTP ' + res.status

    if (res.status === 401) throw new Error('PDFMonkey API Key không hợp lệ hoặc đã hết hạn.')
    if (res.status === 404) throw new Error('Template ID không tồn tại. Kiểm tra VITE_PDFMONKEY_TEMPLATE_ID.')
    if (res.status === 422) throw new Error('Payload không hợp lệ: ' + msg)
    if (res.status === 429) throw new Error('Đã dùng hết quota PDFMonkey. Upgrade plan hoặc chờ reset.')
    throw new Error('PDFMonkey lỗi ' + res.status + ': ' + msg)
  }

  const docId = data?.document?.id
  if (!docId) {
    console.error('[PDFMonkey] No document ID in response:', data)
    throw new Error('PDFMonkey không trả về document ID.')
  }

  console.log('[PDFMonkey] Document created:', docId)
  return { docId, filename: cleanTitle }
}

// ── POLL STATUS ──

async function waitForDocument(documentId, apiKey, onProgress) {
  const MAX_WAIT_MS = 90000
  const POLL_INTERVAL = 2500
  const startTime = Date.now()
  let attempt = 0

  while (Date.now() - startTime < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL))
    attempt++

    const elapsed = Date.now() - startTime
    const progressPercent = Math.min(40 + Math.round((elapsed / MAX_WAIT_MS) * 50), 89)
    onProgress?.({
      step: 3,
      label: 'Đang render PDF... (' + Math.round(elapsed / 1000) + 's)',
      percent: progressPercent,
    })

    try {
      const res = await fetch(
        PDFMONKEY_BASE + '/documents/' + documentId,
        { headers: { 'Authorization': 'Bearer ' + apiKey } },
      )

      if (!res.ok) {
        console.warn('[PDFMonkey] Poll ' + attempt + ' failed: HTTP ' + res.status)
        continue
      }

      const data = await res.json()
      const doc = data?.document

      console.log('[PDFMonkey] Poll ' + attempt + ': status=' + doc?.status)

      if (doc?.status === 'success') {
        if (!doc.download_url) {
          throw new Error('PDF ready nhưng không có download_url.')
        }
        console.log('[PDFMonkey] Success! URL:', doc.download_url.slice(0, 80) + '...')
        return doc.download_url
      }

      if (doc?.status === 'failure') {
        throw new Error(
          'PDFMonkey render thất bại: ' + (doc.failure_cause || 'Unknown') + '\n' +
          'Kiểm tra template đã Publish chưa?'
        )
      }
    } catch (err) {
      if (err.message.includes('render thất bại') || err.message.includes('download_url')) {
        throw err
      }
      console.warn('[PDFMonkey] Poll ' + attempt + ' error:', err.message)
    }
  }

  throw new Error(
    'PDF generation timeout sau ' + (MAX_WAIT_MS / 1000) + 's.\n' +
    'Template có thể quá phức tạp hoặc chưa Publish.'
  )
}

// ── DOWNLOAD ──

async function triggerDownload(downloadUrl, filename) {
  console.log('[PDFMonkey] Downloading...')

  const res = await fetch(downloadUrl)
  if (!res.ok) {
    throw new Error(
      'Không download được file: HTTP ' + res.status + '\n' +
      'Download URL có thể đã expire. Thử xuất lại.'
    )
  }

  const blob = await res.blob()
  console.log('[PDFMonkey] Downloaded blob size:', blob.size, 'bytes')

  if (blob.size < 500) {
    throw new Error('File PDF quá nhỏ (< 500 bytes) — có thể bị lỗi render.')
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf'
  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

// ── MAIN EXPORT ──

export async function buildPDFWithMonkey(sections, config, onProgress) {
  const { apiKey, templateId } = getConfig()

  try {
    // Step 1: Build payload
    onProgress?.({ step: 1, label: 'Chuẩn bị dữ liệu...', percent: 8 })
    const payload = buildPayload(sections, config)

    // Step 2: Create document
    onProgress?.({ step: 2, label: 'Gửi lên PDFMonkey...', percent: 20 })
    const { docId, filename } = await createDocument(payload, apiKey, templateId)

    // Step 3: Wait for render
    onProgress?.({ step: 3, label: 'PDFMonkey đang render...', percent: 35 })
    const downloadUrl = await waitForDocument(docId, apiKey, onProgress)

    // Step 4: Download
    onProgress?.({ step: 4, label: 'Tải file về máy...', percent: 92 })
    await triggerDownload(downloadUrl, filename)

    onProgress?.({ step: 5, label: 'Hoàn thành!', percent: 100 })
    return { success: true, documentId: docId, downloadUrl }

  } catch (err) {
    console.error('[PDFMonkey] Export failed:', err)
    throw err
  }
}

// Test connection (for debugging)
export async function testPdfMonkeyConnection() {
  try {
    const { apiKey } = getConfig()
    const res = await fetch(PDFMONKEY_BASE + '/document_templates', {
      headers: { 'Authorization': 'Bearer ' + apiKey },
    })
    if (res.status === 401) return { ok: false, error: 'API Key không hợp lệ' }
    if (res.ok) return { ok: true }
    return { ok: false, error: 'HTTP ' + res.status }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
