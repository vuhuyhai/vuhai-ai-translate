import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { useThemeProvider, ThemeContext } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { UrlInputZone } from './components/UrlInputZone';
import { ErrorBanner } from './components/ErrorBanner';
import { FileInfoBar } from './components/FileInfoBar';
import { ActionToolbar } from './components/ActionToolbar';
import { SectionCard } from './components/SectionCard';
import { TabBar } from './components/TabBar';
import { ShimmerLoader } from './components/ShimmerLoader';
import { LoginScreen } from './components/LoginScreen';
import { ApiKeyScreen } from './components/ApiKeyScreen';
import { GlossaryPanel } from './components/GlossaryPanel';
import { QuickGuide } from './components/QuickGuide';
import { FeedbackButton } from './components/FeedbackButton';
import { QuotaBanner } from './components/QuotaBanner';
import { UpgradeGuideModal } from './components/UpgradeGuideModal';

// Lazy-load heavy pages — only loaded when user navigates to them
const AdminGuard = lazy(() => import('./components/AdminGuard').then(m => ({ default: m.AdminGuard })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const DocumentViewerPage = lazy(() => import('./pages/DocumentViewerPage').then(m => ({ default: m.DocumentViewerPage })));
const SharedDocumentPage = lazy(() => import('./pages/SharedDocumentPage').then(m => ({ default: m.SharedDocumentPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
import useGlossaryStore from './stores/glossaryStore';
import useKeyStore from './stores/keyStore';
import { authService } from './services/authService';
import { analyticsService } from './services/analyticsService';
import { userService } from './services/userService';
import { onAuthStateChanged } from 'firebase/auth';
import { extractPdfContent } from './services/pdfExtractor';
import { buildSections } from './utils/sectionBuilder';
import { validatePdfFile } from './utils/fileValidation';
import { buildExportText, downloadDocFile, copyToClipboard } from './utils/textUtils';
import { useTranslationPipeline } from './hooks/useTranslationPipeline';
import { getApiKey, setApiKey, setTopic, getTopic, getAudience, setAudience, setProvider, getProvider, PROVIDERS } from './constants/config';
import { TOPICS, AUDIENCES } from './constants/prompts';

function AppContent() {
  const toast = useToast();
  const [authGate, setAuthGate] = useState('checking'); // checking | login | key | ready
  const [currentUser, setCurrentUser] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { quotaPercent, keyTier, quotaLimit, quotaUsedToday } = useKeyStore();
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedPages, setExtractedPages] = useState([]);
  const [sections, setSections] = useState([]);
  const [stage, setStage] = useState('idle'); // idle | extracting | ready | library | viewer | dashboard
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('translation');
  const [viewerDocId, setViewerDocId] = useState(null);
  const [prevStage, setPrevStage] = useState('idle');

  const [inputMode, setInputMode] = useState('pdf'); // 'pdf' | 'url'
  const [showGlossary, setShowGlossary] = useState(false);
  const glossaryEntries = useGlossaryStore(s => s.entries);

  const {
    sectionStates,
    translateSection,
    reviewSection,
    runTranslationPipeline,
    runReviewPipeline,
    resumeWithNewKey,
    resetAllStates,
    manualSave,
    glossaryNotice,
    clearGlossaryNotice,
    translationMode,
    changeMode,
    libraryDocId,
    stats,
  } = useTranslationPipeline(sections, pdfFile ? {
    name: pdfFile.name, size: pdfFile.size, pages: extractedPages.length,
  } : null);

  // ─── Firebase auth: 2-layer gate ───
  useEffect(() => {
    let tracked = false;
    const unsubscribe = onAuthStateChanged(authService.getAuth(), async (user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAnonymous: user.isAnonymous,
          providerData: user.providerData,
        });
        if (!tracked) { tracked = true; analyticsService.track('session_start'); }
        // Check if any Gemini key exists in store
        const { geminiKey } = useKeyStore.getState();
        if (geminiKey && geminiKey.length > 20) {
          setAuthGate('ready');
        } else {
          setAuthGate('key');
        }
      } else {
        setCurrentUser(null);
        setAuthGate('login');
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        analyticsService.track('session_end');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUpgradeToGoogle = useCallback(async () => {
    try {
      const user = await authService.upgradeToGoogle();
      if (user) {
        analyticsService.track('upgrade_to_google');
        toast.success(`Đã đăng nhập: ${user.displayName || user.email}`);
      }
      // null = redirect flow, page navigates away then returns
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Lỗi đăng nhập', error.message);
      }
    }
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    await authService.signOut();
    setCurrentUser(null);
    setAuthGate('login');
    toast.info('Đã đăng xuất');
  }, [toast]);

  // Show toast when glossary terms are discovered
  useEffect(() => {
    if (glossaryNotice && glossaryNotice > 0) {
      toast.info(`Phát hiện ${glossaryNotice} thuật ngữ mới — xem trong bảng thuật ngữ`);
      clearGlossaryNotice();
    }
  }, [glossaryNotice, clearGlossaryNotice, toast]);

  // ─── Reset everything ───
  const resetAll = useCallback(() => {
    resetAllStates();
    setPdfFile(null);
    setExtractedPages([]);
    setSections([]);
    setStage('idle');
    setErrorMessage('');
    setActiveTab('translation');
    toast.info('Đã reset, sẵn sàng upload file mới');
  }, [resetAllStates, toast]);

  // ─── Reset to URL input mode ───
  const handleNewUrl = useCallback(() => {
    resetAllStates();
    setPdfFile(null);
    setExtractedPages([]);
    setSections([]);
    setStage('idle');
    setErrorMessage('');
    setActiveTab('translation');
    setInputMode('url');
  }, [resetAllStates]);

  // ─── Process uploaded PDF ───
  const handleFileSelected = useCallback(async (selectedFile) => {
    const validationError = validatePdfFile(selectedFile);
    if (validationError) {
      setErrorMessage(validationError);
      toast.error('File không hợp lệ', validationError);
      return;
    }

    setErrorMessage('');
    setPdfFile(selectedFile);
    setExtractedPages([]);
    setSections([]);
    resetAllStates();
    setActiveTab('translation');
    setStage('extracting');

    try {
      const pages = await extractPdfContent(selectedFile);

      if (pages.every(p => !p.text)) {
        setErrorMessage('PDF không chứa text có thể đọc được (có thể là ảnh scan).');
        toast.error('Không đọc được nội dung PDF');
        setStage('idle');
        setPdfFile(null);
        return;
      }

      setExtractedPages(pages);
      const builtSections = buildSections(pages);
      setSections(builtSections);
      setStage('ready');
      toast.success(`Đã tải "${selectedFile.name}" — ${pages.length} trang, ${builtSections.length} đoạn`);
      analyticsService.track('pdf_upload', { pages: pages.length, fileSize: selectedFile.size, sections: builtSections.length });
      if (currentUser) userService.incrementStat(currentUser.uid, 'pdfUploadCount');
    } catch (extractionError) {
      const isPasswordProtected = extractionError.message?.includes('password');
      const msg = isPasswordProtected
        ? 'PDF được bảo vệ bằng mật khẩu, không thể đọc.'
        : `Lỗi: ${extractionError.message}`;
      setErrorMessage(msg);
      toast.error('Lỗi đọc PDF', msg);
      setStage('idle');
    }
  }, [resetAllStates, toast, currentUser]);

  // ─── URL extraction handler ───
  const handleUrlExtracted = useCallback(({ text, title, wordCount, sourceUrl, sourceType }) => {
    resetAllStates();
    setActiveTab('translation');
    setErrorMessage('');

    // Convert plain text → pages format for buildSections
    const pages = [{ page: 1, text }];
    const builtSections = buildSections(pages);

    setPdfFile({
      name: title,
      size: text.length,
      pages: 1,
      sourceUrl,
      sourceType,
    });
    setExtractedPages(pages);
    setSections(builtSections);
    setStage('ready');
    toast.success(`Đã đọc "${title}" — ~${wordCount.toLocaleString()} từ, ${builtSections.length} đoạn`);
    analyticsService.track('url_import', { wordCount, sections: builtSections.length });
  }, [resetAllStates, toast]);

  // ─── Export helpers ───
  const getExportField = useCallback(() => activeTab === 'review' ? 'reviewed' : 'translated', [activeTab]);

  const handleCopy = useCallback(async () => {
    const exportText = buildExportText(sections, sectionStates, getExportField());
    await copyToClipboard(exportText);
    toast.success('Đã copy vào clipboard!');
    analyticsService.track('copy_clipboard');
  }, [sections, sectionStates, getExportField, toast]);

  const handleDownloadDoc = useCallback(() => {
    const exportField = getExportField();
    const baseName = pdfFile?.name?.replace('.pdf', '') || 'document';
    downloadDocFile(sections, sectionStates, exportField, `${baseName}_${exportField}.doc`);
    toast.success('Đã tải file .doc xuống!');
    analyticsService.track('export_doc');
  }, [sections, sectionStates, getExportField, pdfFile, toast]);

  const handleChangeApiKey = useCallback(() => {
    setAuthGate('key');
  }, []);

  // ─── Auth gate renders ───
  if (authGate === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-app)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (authGate === 'login') {
    return <LoginScreen onLogin={() => {
      const { geminiKey } = useKeyStore.getState();
      setAuthGate(geminiKey && geminiKey.length > 20 ? 'ready' : 'key');
    }} />;
  }

  if (authGate === 'key') {
    return <ApiKeyScreen onSubmit={(key, topicId, audienceId, providerId) => {
      setProvider(providerId);
      setApiKey(key);
      setTopic(topicId);
      setAudience(audienceId);
      setAuthGate('ready');
    }} initialApiKey={getApiKey()} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-app)' }}>
      <Header
        onChangeApiKey={handleChangeApiKey}
        onToggleGlossary={() => setShowGlossary(v => !v)}
        glossaryCount={glossaryEntries.length}
        currentUser={currentUser}
        onUpgradeToGoogle={handleUpgradeToGoogle}
        onSignOut={handleSignOut}
        onOpenLibrary={() => setStage('library')}
        onOpenDashboard={() => { setPrevStage(stage); setStage('dashboard'); }}
      />
      <GlossaryPanel isOpen={showGlossary} onClose={() => setShowGlossary(false)} />
      <UpgradeGuideModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onKeyEntered={() => {
          toast.success('⭐ Đã nâng cấp Paid Key! Dịch không giới hạn.');
          setShowUpgradeModal(false);
        }}
      />

      {/* ── Dashboard ── */}
      {stage === 'dashboard' && (
        <Suspense fallback={<LazyFallback />}>
          <DashboardPage
            onBack={() => setStage(prevStage || 'idle')}
            onOpenDocument={(docId) => { setViewerDocId(docId); setStage('viewer'); }}
          />
        </Suspense>
      )}

      {/* ── Library Page ── */}
      {stage === 'library' && (
        <Suspense fallback={<LazyFallback />}>
          <LibraryPage
            onOpenDocument={(docId) => { setViewerDocId(docId); setStage('viewer'); }}
            onNewTranslation={() => { resetAll(); setStage('idle'); }}
          />
        </Suspense>
      )}

      {/* ── Document Viewer ── */}
      {stage === 'viewer' && viewerDocId && (
        <Suspense fallback={<LazyFallback />}>
          <DocumentViewerPage
            documentId={viewerDocId}
            onBack={() => setStage('library')}
          />
        </Suspense>
      )}

      {/* ── Translation workspace ── */}
      {stage !== 'library' && stage !== 'viewer' && stage !== 'dashboard' && (
        <>
          <main className="main-content" style={{ padding: '24px clamp(16px, 3vw, 48px)' }}>
            <QuickGuide />
            <QuotaBanner
              percent={quotaPercent}
              remaining={Math.max(0, quotaLimit - quotaUsedToday)}
              tier={keyTier}
              onUpgradeClick={() => setShowUpgradeModal(true)}
              pendingSections={stats.totalSections - stats.translatedCount}
              completedSections={stats.translatedCount}
              projectName={pdfFile?.name?.replace('.pdf', '') || ''}
              onResumeTranslation={resumeWithNewKey}
              translationMode={translationMode}
            />

            {/* Upload zone — PDF or URL */}
            {stage === 'idle' && !pdfFile && (
              <div>
                <div className="input-mode-tabs">
                  <button
                    className={`input-mode-tab ${inputMode === 'pdf' ? 'active' : ''}`}
                    onClick={() => setInputMode('pdf')}
                  >📄 File PDF</button>
                  <button
                    className={`input-mode-tab ${inputMode === 'url' ? 'active' : ''}`}
                    onClick={() => setInputMode('url')}
                  >🔗 Đường link</button>
                </div>

                {inputMode === 'pdf' && <UploadZone onFileSelected={handleFileSelected} />}
                {inputMode === 'url' && <UrlInputZone onExtracted={handleUrlExtracted} />}
              </div>
            )}

            {/* Error banner */}
            <ErrorBanner message={errorMessage} onRetry={resetAll} />

            {/* Extracting skeleton */}
            {stage === 'extracting' && (
              <div className="card fade-in" style={{
                padding: '48px 40px', marginTop: 24, textAlign: 'center',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-light)', margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div className="spinner spinner-lg" />
                </div>
                <div style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Đang đọc file PDF...
                </div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginTop: 6 }}>
                  Trích xuất nội dung văn bản từ tài liệu
                </div>
                <div style={{ maxWidth: 480, margin: '24px auto 0' }}>
                  <ShimmerLoader lineCount={4} />
                </div>
              </div>
            )}

            {/* Ready state: file info + sections */}
            {stage === 'ready' && sections.length > 0 && (
              <div className="fade-in" style={{ marginTop: 20 }}>
                <FileInfoBar
                  fileName={pdfFile?.name}
                  fileSize={pdfFile?.size || 0}
                  pageCount={extractedPages.length}
                  sectionCount={stats.totalSections}
                  translatedCount={stats.translatedCount}
                  reviewedCount={stats.reviewedCount}
                  hasAnyReview={stats.hasAnyReview}
                  onReset={resetAll}
                  sourceType={pdfFile?.sourceType}
                  onNewUrl={handleNewUrl}
                />

                <ActionToolbar
                  onTranslateAll={runTranslationPipeline}
                  onReviewAll={runReviewPipeline}
                  onCopy={handleCopy}
                  onDownloadDoc={handleDownloadDoc}
                  onManualSave={manualSave}
                  onOpenDashboard={() => { setPrevStage(stage); setStage('dashboard'); }}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  stats={stats}
                  translationMode={translationMode}
                  onModeChange={changeMode}
                  sections={sections}
                  sectionStates={sectionStates}
                  pdfFile={pdfFile ? { name: pdfFile.name, size: pdfFile.size, pages: extractedPages.length } : null}
                  libraryDocId={libraryDocId}
                  exportConfig={{
                    topic: getTopic(),
                    audience: getAudience(),
                    provider: getProvider(),
                    mode: translationMode,
                    title: pdfFile?.name?.replace('.pdf', '') || '',
                  }}
                />

                {sections.map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    sectionState={sectionStates[section.id]}
                    onTranslate={translateSection}
                    onReview={reviewSection}
                    activeTab={activeTab}
                  />
                ))}
              </div>
            )}
          </main>

          <footer style={{
            textAlign: 'center', padding: '32px 0 24px',
            fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)', margin: '32px 24px 0',
          }}>
            <div style={{ marginBottom: 4 }}>
              Thiết kế và xây dựng bởi{' '}
              <a
                href="https://www.facebook.com/vuhai.fitness/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                Vũ Hải | Business Consultant
              </a>
            </div>
          </footer>
        </>
      )}

      <FeedbackButton />
    </div>
  );
}

const LazyFallback = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner spinner-lg" />
  </div>
);

function AdminPage() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    </Suspense>
  );
}

export default function App() {
  const themeValue = useThemeProvider();
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin');
  const [shareId, setShareId] = useState(null);

  useEffect(() => {
    const handleHash = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', handleHash);

    // Check for /share/:id path
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      setShareId(path.split('/share/')[1]);
    }

    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <ThemeContext.Provider value={themeValue}>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'var(--font-body)' },
        }}
      />
      {shareId ? (
        <Suspense fallback={<LazyFallback />}>
          <SharedDocumentPage shareId={shareId} />
        </Suspense>
      ) : isAdmin ? (
        <AdminPage />
      ) : (
        <AppContent />
      )}
    </ThemeContext.Provider>
  );
}
