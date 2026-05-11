/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, pdf, Font,
} from '@react-pdf/renderer';

// ── FONT: Noto Serif — full Vietnamese Unicode support ──
Font.register({
  family: 'NotoSerif',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-serif@latest/vietnamese-400-normal.woff2',
      fontWeight: 'normal',
    },
    {
      src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-serif@latest/vietnamese-700-normal.woff2',
      fontWeight: 'bold',
    },
  ],
});

// Disable hyphenation (breaks Vietnamese words)
Font.registerHyphenationCallback(word => [word]);

// ── TCVN 5709:2009 STANDARDS ──
// Page: A4 (595.28 x 841.89 pt)
// Margins: left 30mm (85pt, binding), right 15mm (43pt), top 20mm (57pt), bottom 20mm (57pt)
// Body: 13pt serif, line-height 1.5
// Headings: h1 18pt, h2 15pt, h3 13pt bold

const MARGIN = { top: 65, bottom: 57, left: 85, right: 43 };

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSerif',
    fontSize: 13,
    lineHeight: 1.5,
    paddingTop: MARGIN.top,
    paddingBottom: MARGIN.bottom,
    paddingLeft: MARGIN.left,
    paddingRight: MARGIN.right,
    color: '#1a1a1a',
  },
  coverPage: {
    fontFamily: 'NotoSerif',
    paddingTop: 0,
    paddingBottom: MARGIN.bottom,
    paddingLeft: MARGIN.left,
    paddingRight: MARGIN.right,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 22, fontWeight: 'bold', textAlign: 'center',
    marginBottom: 24, lineHeight: 1.4, color: '#111',
  },
  coverMeta: {
    fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 8,
  },
  coverDivider: {
    width: 60, height: 1, backgroundColor: '#ccc', marginVertical: 18,
  },
  coverWatermark: {
    position: 'absolute', bottom: 30, left: MARGIN.left, right: MARGIN.right,
    fontSize: 9, color: '#bbb', textAlign: 'center',
  },
  header: {
    position: 'absolute', top: 14, left: MARGIN.left, right: MARGIN.right,
    fontSize: 9, color: '#999',
    borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingBottom: 6,
  },
  footer: {
    position: 'absolute', bottom: 24, left: MARGIN.left, right: MARGIN.right,
    fontSize: 10, color: '#999', textAlign: 'right',
  },
  h1: {
    fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 10, color: '#111',
  },
  h2: {
    fontSize: 15, fontWeight: 'bold', marginTop: 18, marginBottom: 8, color: '#222',
  },
  h3: {
    fontSize: 13, fontWeight: 'bold', marginTop: 14, marginBottom: 6, color: '#333',
  },
  paragraph: {
    fontSize: 13, lineHeight: 1.5, marginBottom: 10, color: '#1a1a1a',
    textAlign: 'justify',
  },
  bulletRow: {
    flexDirection: 'row', marginBottom: 4, paddingLeft: 14,
  },
  bulletDot: {
    width: 16, fontSize: 13, color: '#1a1a1a',
  },
  bulletText: {
    flex: 1, fontSize: 13, lineHeight: 1.5, color: '#1a1a1a',
  },
  sectionBreak: {
    marginTop: 8,
  },
});

// ── PARSE TEXT INTO BLOCKS ──
// Groups consecutive lines of the same type into blocks,
// so numbered lists maintain correct sequential numbering.
function parseBlocks(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip empty lines
    if (!trimmed) { i++; continue; }

    // Headings (#### → h3, ### → h3, ## → h2, # → h1)
    if (trimmed.match(/^#{4,}\s+/)) {
      blocks.push({ type: 'h3', content: trimmed.replace(/^#{4,}\s+/, '') });
      i++; continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', content: trimmed.slice(4) });
      i++; continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', content: trimmed.slice(3) });
      i++; continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', content: trimmed.slice(2) });
      i++; continue;
    }

    // Bullet list — collect all consecutive bullet lines
    if (trimmed.match(/^[-•*]\s/)) {
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; break; }
        if (t.match(/^[-•*]\s/)) {
          items.push(t.replace(/^[-•*]\s+/, ''));
          i++;
        } else break;
      }
      if (items.length > 0) blocks.push({ type: 'bullet-list', items });
      continue;
    }

    // Numbered list — collect all consecutive numbered lines
    if (trimmed.match(/^\d+[.)]\s/)) {
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; break; }
        if (t.match(/^\d+[.)]\s/)) {
          items.push(t.replace(/^\d+[.)]\s+/, ''));
          i++;
        } else break;
      }
      if (items.length > 0) blocks.push({ type: 'numbered-list', items });
      continue;
    }

    // Regular paragraph — preserve individual lines for line-break rendering
    const paraLines = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) { i++; break; }
      if (t.match(/^#{1,6}\s/) || t.match(/^[-•*]\s/) || t.match(/^\d+[.)]\s/)) break;
      paraLines.push(t);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paraLines });
    }
  }

  return blocks;
}

// ── INLINE MARKDOWN → react-pdf <Text> fragments ──
function renderInline(text, key) {
  // Split by bold+italic (***), bold (**), italic (*), code (`)
  const parts = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) parts.push({ text: match[2], bold: true, italic: true });
    else if (match[3]) parts.push({ text: match[3], bold: true });
    else if (match[4]) parts.push({ text: match[4], italic: true });
    else if (match[5]) parts.push({ text: match[5], code: true });
    lastIndex = regex.lastIndex;
  }
  // Remaining plain text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  if (parts.length === 1 && !parts[0].bold && !parts[0].italic && !parts[0].code) {
    return parts[0].text;
  }

  return parts.map((p, i) => {
    const style = {};
    if (p.bold) style.fontWeight = 'bold';
    if (p.italic) style.fontStyle = 'italic';
    if (p.code) { style.fontFamily = 'Courier'; style.fontSize = 10; style.backgroundColor = '#f3f4f6'; }
    return Object.keys(style).length > 0
      ? <Text key={`${key}-i${i}`} style={style}>{p.text}</Text>
      : p.text;
  });
}

// ── RENDER BLOCKS → JSX elements for react-pdf ──
function renderContent(text, baseKey) {
  if (!text) return [];
  const blocks = parseBlocks(text);

  return blocks.map((block, i) => {
    const k = `${baseKey}-${i}`;

    switch (block.type) {
      case 'h1':
        return <Text key={k} style={s.h1}>{renderInline(block.content, k)}</Text>;
      case 'h2':
        return <Text key={k} style={s.h2}>{renderInline(block.content, k)}</Text>;
      case 'h3':
        return <Text key={k} style={s.h3}>{renderInline(block.content, k)}</Text>;

      case 'bullet-list':
        return (
          <View key={k}>
            {block.items.map((item, li) => (
              <View key={`${k}-${li}`} style={s.bulletRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{renderInline(item, `${k}-${li}`)}</Text>
              </View>
            ))}
          </View>
        );

      case 'numbered-list':
        return (
          <View key={k}>
            {block.items.map((item, li) => (
              <View key={`${k}-${li}`} style={s.bulletRow}>
                <Text style={{ ...s.bulletDot, width: 20 }}>{li + 1}.</Text>
                <Text style={s.bulletText}>{renderInline(item, `${k}-${li}`)}</Text>
              </View>
            ))}
          </View>
        );

      case 'paragraph':
      default: {
        // Render each line with \n between them — react-pdf renders \n as line break within <Text>
        const lineEls = (block.lines || [block.content]).map((ln, li) => {
          const isLast = li === (block.lines || [block.content]).length - 1;
          return (
            <React.Fragment key={`${k}-l${li}`}>
              {renderInline(ln, `${k}-l${li}`)}
              {!isLast && '\n'}
            </React.Fragment>
          );
        });
        return (
          <Text key={k} style={s.paragraph}>
            {lineEls}
          </Text>
        );
      }
    }
  }).filter(Boolean);
}

// ── Cover Page Component ──
function CoverPage({ title, author, organization }) {
  const date = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 11, color: '#888', marginBottom: 30, letterSpacing: 2 }}>
          BẢN DỊCH TIẾNG VIỆT
        </Text>
        <Text style={s.coverTitle}>{title}</Text>
        <View style={s.coverDivider} />
        {author ? <Text style={s.coverMeta}>Dịch giả: {author}</Text> : null}
        {organization ? <Text style={s.coverMeta}>{organization}</Text> : null}
        <Text style={{ ...s.coverMeta, marginTop: 16 }}>{date}</Text>
      </View>
      <Text style={s.coverWatermark}>Được tạo bởi VuHai AI Translate · aitranslate.space</Text>
    </Page>
  );
}

// ── Content Page Component ──
function ContentPage({ title, children, hasCover }) {
  const headerText = title.length > 70 ? title.slice(0, 67) + '...' : title;
  return (
    <Page size="A4" style={s.page} wrap>
      <Text style={s.header} fixed>{headerText}</Text>
      <View>{children}</View>
      <Text
        style={s.footer}
        fixed
        render={({ pageNumber, totalPages }) => {
          const num = hasCover ? pageNumber - 1 : pageNumber;
          const total = hasCover ? totalPages - 1 : totalPages;
          return num > 0 ? `Trang ${num} / ${total}` : '';
        }}
      />
    </Page>
  );
}

// ── Section separator (visual break between sections) ──
function SectionSeparator({ keyId }) {
  return (
    <View key={keyId} style={s.sectionBreak} break>
      {/* break prop forces page break before this section */}
    </View>
  );
}

// ── BUILD PDF ──
export async function buildPDF(documentData, config = {}) {
  const { includeCoverPage = true, metadata = {} } = config;

  const doneSections = (documentData.sections || []).filter(sec => sec.status === 'done');

  const docTitle = metadata.title
    || documentData.customTitle
    || (documentData.title || '').replace('.pdf', '')
    || 'Bản dịch';

  // Build content elements with section breaks
  const contentEls = [];
  for (let i = 0; i < doneSections.length; i++) {
    const sec = doneSections[i];
    const text = (sec.harmonizedText || sec.cleanedText || sec.translatedText || '').trim();
    if (!text) continue;

    // Page break between sections (not before first)
    if (contentEls.length > 0) {
      contentEls.push(<SectionSeparator key={`brk-${sec.id}`} keyId={`brk-${sec.id}`} />);
    }

    const title = sec.title || '';
    const isReal = title
      && !title.match(/^(Phần|Section|Part|Đoạn)\s+\d+/i)
      && !title.match(/Trang\s+\d+/i)
      && title.length < 120;

    if (isReal) {
      contentEls.push(
        <Text key={`st-${sec.id}`} style={{ ...s.h1, marginTop: 0 }}>
          {title}
        </Text>
      );
    }

    contentEls.push(...renderContent(text, sec.id));
  }

  // Build document
  const doc = (
    <Document
      title={docTitle}
      author={metadata.author || 'VuHai AI Translate'}
      creator="VuHai AI Translate"
      language="vi"
    >
      {includeCoverPage && (
        <CoverPage
          title={docTitle}
          author={metadata.author}
          organization={metadata.organization}
        />
      )}
      <ContentPage title={docTitle} hasCover={includeCoverPage}>
        {contentEls}
      </ContentPage>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const safeName = docTitle
    .replace(/[^\w\sÀ-ỹ-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'ban-dich';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
