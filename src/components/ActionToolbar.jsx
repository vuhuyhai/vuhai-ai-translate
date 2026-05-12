import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TabBar } from './TabBar';
import { PdfProgressModal } from './PdfProgressModal';
import { buildPDFWithMonkey } from '../services/pdfMonkeyService';
// Dynamic import — @react-pdf/renderer (1.6MB) only loads when user exports PDF
const loadPdfBuilder = () => import('../services/pdfBuilder').then(m => m.buildPDF);
import { cleanSectionContent } from '../utils/contentCleaner';
import { libraryService } from '../services/libraryService';
import { auth } from '../services/firebase';
import useGlossaryStore from '../stores/glossaryStore';
import { activityService } from '../services/activityService';

const PDF_STEPS = [
  { label: 'Chuẩn bị nội dung', desc: 'Gom các đoạn đã dịch...' },
  { label: 'Làm sạch văn bản', desc: 'Xóa metadata thừa, chuẩn hóa...' },
  { label: 'Gửi lên PDFMonkey', desc: 'Đang tạo tài liệu trên server...' },
  { label: 'Đang render PDF', desc: 'PDFMonkey đang tạo file...' },
  { label: 'Tải file về máy', desc: 'Hoàn thành!' },
];


export const ActionToolbar = React.memo(function ActionToolbar({
  onTranslateAll, onReviewAll, onCopy, onDownloadDoc, onManualSave, onOpenDashboard,
  activeTab, onTabChange, stats,
  sections, sectionStates, exportConfig, pdfFile, libraryDocId,
}) {
  const { hasAnyTranslation, hasAnyReview, allTranslated, isAnyWorking } = stats;
  const [copied, setCopied] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedJust, setSavedJust] = useState(false);

  // Progress modal state
  const [showProgress, setShowProgress] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  const handleManualSave = useCallback(async () => {
    if (isSaving || !onManualSave) return;
    setIsSaving(true);
    try {
      await onManualSave();
      setSavedJust(true);
      toast.success('Đã lưu bản dịch vào trang cá nhân!', {
        action: onOpenDashboard ? {
          label: 'Xem trang cá nhân',
          onClick: () => onOpenDashboard(),
        } : undefined,
        duration: 4000,
      });
      setTimeout(() => setSavedJust(false), 3000);
    } catch (err) {
      toast.error(err.message || 'Lưu thất bại. Kiểm tra đăng nhập.');
    } finally {
      setIsSaving(false);
    }
  }, [onManualSave, onOpenDashboard, isSaving]);

  // ── PDF Export — straight to PDFMonkey (or react-pdf fallback) ──
  const handlePdfExport = useCallback(async () => {
    if (isPdfExporting) return;

    setIsPdfExporting(true);
    setShowProgress(true);
    setCurrentStepIndex(0);
    setProgressPercent(5);

    try {
      // ── Step 0: Chuẩn bị nội dung ──
      const sectionsForExport = sections
        .map(s => {
          const state = sectionStates?.[s.id];
          const text =
            state?.reviewed ||
            state?.harmonizedText ||
            state?.translated ||
            s.harmonizedText ||
            s.cleanedText ||
            s.translatedText ||
            '';
          if (!text || text.trim().length < 10) return null;
          return {
            id: s.id,
            title: s.title || '',
            status: 'done',
            translatedText: text,
            harmonizedText: text,
            originalText: s.text || s.pages?.map(p => p.text).join('\n\n') || '',
            wordCount: text.split(/\s+/).filter(Boolean).length,
          };
        })
        .filter(Boolean);

      if (sectionsForExport.length === 0) {
        toast.error('Chưa có đoạn nào được dịch. Dịch ít nhất 1 đoạn rồi thử lại.');
        setShowProgress(false);
        setIsPdfExporting(false);
        return;
      }

      // ── Step 1: Làm sạch văn bản (single pass) ──
      setCurrentStepIndex(1);
      setProgressPercent(15);

      const cleanedSections = sectionsForExport.map(s => {
        const cleaned = cleanSectionContent(s.translatedText);
        return {
          ...s,
          translatedText: cleaned,
          harmonizedText: cleaned,
          cleanedText: cleaned,
        };
      });

      // Fetch glossary once for both export and library save
      const glossary = useGlossaryStore.getState().getApproved();
      const totalWords = cleanedSections.reduce((sum, s) => sum + (s.wordCount || 0), 0);

      // ── Step 2–4: PDFMonkey render + download ──
      setCurrentStepIndex(2);
      setProgressPercent(25);

      const hasPdfMonkeyKey = !!import.meta.env.VITE_PDFMONKEY_API_KEY;

      if (hasPdfMonkeyKey) {
        await buildPDFWithMonkey(
          cleanedSections,
          {
            title: pdfFile?.name || 'ban-dich',
            author: auth.currentUser?.displayName || '',
            topic: exportConfig?.topic || 'general',
            glossary,
          },
          (prog) => {
            if (prog.step <= 2) {
              setCurrentStepIndex(2);
              setProgressPercent(Math.max(25, Math.min(prog.percent || 25, 44)));
            } else if (prog.step === 3) {
              setCurrentStepIndex(3);
              setProgressPercent(Math.max(45, Math.min(prog.percent || 45, 89)));
            } else if (prog.step >= 4) {
              setCurrentStepIndex(4);
              setProgressPercent(Math.max(90, prog.percent || 90));
            }
          },
        );
      } else {
        // Fallback to react-pdf (lazy-loaded)
        setCurrentStepIndex(3);
        setProgressPercent(50);
        const buildPDFFn = await loadPdfBuilder();
        await buildPDFFn(
          { sections: cleanedSections, title: pdfFile?.name, customTitle: pdfFile?.name?.replace('.pdf', '') },
          {
            includeCoverPage: true,
            metadata: { title: pdfFile?.name?.replace('.pdf', '') || '', author: auth.currentUser?.displayName || '' },
          },
        );
      }

      // ── Done ──
      setCurrentStepIndex(4);
      setProgressPercent(100);
      toast.success('Xuất PDF thành công!');

      // Save to library + activity log in parallel (non-blocking)
      const backgroundTasks = [];

      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        backgroundTasks.push(
          libraryService.saveDocument({
            id: libraryDocId || undefined,
            title: pdfFile?.name || 'Untitled',
            sections: cleanedSections.map(s => ({
              id: s.id, title: s.title || '',
              originalText: s.originalText || '',
              translatedText: s.translatedText,
              harmonizedText: s.harmonizedText || s.translatedText,
              cleanedText: s.cleanedText,
              wordCount: s.wordCount || 0, status: 'done',
            })),
            glossary: glossary.map(e => ({ en: e.termEN || e.en, vi: e.termVI || e.vi })),
            topic: exportConfig?.topic, audience: exportConfig?.audience,
            status: sectionsForExport.length === sections.length ? 'complete' : 'partial',
            totalSections: sections.length, completedSections: sectionsForExport.length,
            totalWords,
            fileMetadata: { name: pdfFile?.name || '', size: pdfFile?.size || 0, pages: pdfFile?.pages || 0 },
          }).then(() => toast.success('Đã lưu vào thư viện', { duration: 3000 }))
            .catch(err => console.warn('[Export] Save to library failed:', err))
        );
      }

      backgroundTasks.push(
        activityService.log('pdf_exported', {
          documentId: libraryDocId,
          documentTitle: pdfFile?.name,
          sectionsCount: sectionsForExport.length,
          wordsTranslated: totalWords,
        }).catch(() => {})
      );

      // Fire and forget — don't block UI
      Promise.all(backgroundTasks);

    } catch (err) {
      console.error('[PDF Export] Error:', err);
      toast.error(err.message || 'Xuất PDF thất bại. Thử lại.', { duration: 8000 });
    } finally {
      // Delay closing modal briefly so user sees 100% state
      setTimeout(() => {
        setShowProgress(false);
        setIsPdfExporting(false);
        setCurrentStepIndex(0);
        setProgressPercent(0);
      }, 800);
    }
  }, [sections, sectionStates, exportConfig, pdfFile, libraryDocId, isPdfExporting]);

  return (
    <div className="action-toolbar">
      <div className="toolbar-left">
        <button
          className="toolbar-btn-primary-lg"
          onClick={onTranslateAll}
          disabled={isAnyWorking || allTranslated}
        >
          {isAnyWorking && <div className="spinner spinner-inverse" style={{ width: 14, height: 14 }} />}
          🔄 Dịch tất cả
        </button>

        {hasAnyTranslation && (
          <button className="toolbar-btn-review-lg" onClick={onReviewAll} disabled={isAnyWorking}>
            ✨ Duyệt lại tất cả
          </button>
        )}
      </div>

      <div className="toolbar-right">
        {pdfFile?.sourceType === 'url' && pdfFile?.sourceUrl && (
          <a
            href={pdfFile.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="toolbar-source-link"
          >
            🔗 Xem bài gốc
          </a>
        )}

        {hasAnyTranslation && (
          <TabBar activeTab={activeTab} onTabChange={onTabChange} hasAnyReview={hasAnyReview} />
        )}

        {hasAnyTranslation && (
          <>
            <button
              className={`toolbar-btn-save ${isSaving ? 'is-saving' : ''} ${savedJust ? 'is-saved' : ''}`}
              onClick={handleManualSave}
              disabled={isSaving}
            >
              {isSaving ? '⏳ Đang lưu...' : savedJust ? '✅ Đã lưu!' : '💾 Lưu bản dịch'}
            </button>

            <button className="toolbar-btn-ghost" onClick={handleCopy}>
              {copied ? '✅ Đã copy toàn bộ!' : '📋 Copy văn bản'}
            </button>

            <button className="toolbar-btn-doc" onClick={onDownloadDoc}>
              📄 Tải .doc
            </button>

            <button
              className="toolbar-btn-pdf"
              onClick={handlePdfExport}
              disabled={!hasAnyTranslation || isPdfExporting}
            >
              {isPdfExporting ? '⏳ Đang xuất...' : '📄 Xuất PDF hoàn chỉnh'}
            </button>
          </>
        )}
      </div>

      <PdfProgressModal
        isOpen={showProgress}
        steps={PDF_STEPS}
        currentStepIndex={currentStepIndex}
        percent={progressPercent}
        onClose={progressPercent >= 100 ? () => {
          setShowProgress(false);
          setCurrentStepIndex(0);
          setProgressPercent(0);
        } : undefined}
      />
    </div>
  );
});
