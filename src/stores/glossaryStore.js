import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergeNewTerms, buildGlossaryContext } from '../services/glossaryService';

const useGlossaryStore = create(persist(
  (set, get) => ({
    entries: [],

    addEntries: (newEntries) => {
      if (!newEntries.length) return 0;
      const merged = mergeNewTerms(get().entries, newEntries);
      const addedCount = merged.length - get().entries.length;
      set({ entries: merged });
      return addedCount;
    },

    approveEntry: (id) => {
      set({
        entries: get().entries.map(e =>
          e.id === id ? { ...e, status: 'approved', updatedAt: Date.now() } : e
        ),
      });
    },

    approveAll: () => {
      set({
        entries: get().entries.map(e =>
          e.status === 'suggested' ? { ...e, status: 'approved', updatedAt: Date.now() } : e
        ),
      });
    },

    rejectEntry: (id) => {
      set({
        entries: get().entries.map(e =>
          e.id === id ? { ...e, status: 'rejected', updatedAt: Date.now() } : e
        ),
      });
    },

    updateEntry: (id, changes) => {
      set({
        entries: get().entries.map(e =>
          e.id === id ? { ...e, ...changes, updatedAt: Date.now() } : e
        ),
      });
    },

    clearAll: () => set({ entries: [] }),

    getApproved: () => get().entries.filter(e => e.status === 'approved'),

    getByStatus: (status) => get().entries.filter(e => e.status === status),

    getGlossaryPrompt: () => {
      const context = buildGlossaryContext(get().entries);
      if (!context) return '';
      return `\n---\nBẢNG THUẬT NGỮ BẮT BUỘC (dùng đúng 100%, không dịch khác):\n${context}`;
    },

    exportAsMarkdown: () => {
      return buildGlossaryContext(get().entries);
    },
  }),
  { name: 'vuhai_glossary' }
));

export default useGlossaryStore;
