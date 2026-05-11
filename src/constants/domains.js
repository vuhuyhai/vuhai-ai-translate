/**
 * Domain classification for glossary terms.
 * Each domain has keywords used for smart auto-classification.
 */

export const DOMAINS = [
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📊',
    color: '#e04544',
    keywords: [
      'marketing', 'brand', 'campaign', 'advertising', 'ad ', 'ads ', 'seo', 'sem', 'content',
      'social media', 'engagement', 'conversion', 'funnel', 'lead', 'cta', 'ctr', 'cpc', 'cpm',
      'impression', 'reach', 'awareness', 'positioning', 'segmentation', 'targeting',
      'copywriting', 'headline', 'tagline', 'slogan', 'creative', 'viral', 'influencer',
      'affiliate', 'referral', 'loyalty', 'retention', 'churn', 'persona', 'journey',
      'touchpoint', 'omnichannel', 'multichannel', 'inbound', 'outbound', 'drip',
      'newsletter', 'email marketing', 'landing page', 'squeeze', 'opt-in', 'subscriber',
      'pr ', 'public relation', 'media', 'press', 'promotion', 'merchandis',
      '4p', '4c', 'aida', 'swot', 'usp', 'value proposition',
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: '🤝',
    color: '#f59e0b',
    keywords: [
      'sales', 'selling', 'deal', 'close', 'prospect', 'pipeline', 'quota',
      'commission', 'territory', 'cold call', 'warm lead', 'hot lead', 'pitch',
      'proposal', 'negotiat', 'discount', 'pricing', 'upsell', 'cross-sell',
      'client', 'account', 'relationship', 'crm', 'objection', 'closing',
      'revenue', 'booking', 'forecast', 'win rate', 'lost deal',
      'b2b', 'b2c', 'saas', 'enterprise', 'smb',
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: '💰',
    color: '#10b981',
    keywords: [
      'finance', 'financial', 'revenue', 'profit', 'margin', 'cost', 'expense',
      'budget', 'forecast', 'cash flow', 'balance sheet', 'income statement',
      'roi', 'roa', 'roe', 'ebitda', 'p/e', 'eps', 'dividend',
      'investment', 'investor', 'equity', 'debt', 'loan', 'interest',
      'asset', 'liability', 'capital', 'valuation', 'ipo', 'stock', 'share',
      'tax', 'audit', 'compliance', 'regulation', 'accounting', 'bookkeep',
      'billing', 'invoice', 'payment', 'receivable', 'payable',
    ],
  },
  {
    id: 'technology',
    label: 'Technology',
    icon: '💻',
    color: '#6366f1',
    keywords: [
      'technology', 'software', 'hardware', 'algorithm', 'data', 'database',
      'api', 'cloud', 'server', 'deploy', 'devops', 'agile', 'scrum',
      'machine learning', 'deep learning', 'neural', 'ai ', 'artificial intelligence',
      'automation', 'bot', 'robot', 'iot', 'blockchain', 'crypto',
      'code', 'programming', 'developer', 'engineer', 'frontend', 'backend',
      'mobile', 'web', 'app ', 'platform', 'saas', 'paas', 'iaas',
      'cyber', 'encrypt', 'firewall', 'security', 'vulnerab',
      'ux', 'ui', 'interface', 'user experience', 'wireframe', 'prototype',
    ],
  },
  {
    id: 'management',
    label: 'Management',
    icon: '📋',
    color: '#8b5cf6',
    keywords: [
      'management', 'manager', 'leader', 'leadership', 'strategy', 'strategic',
      'organization', 'culture', 'team', 'hire', 'hiring', 'recruit', 'talent',
      'performance', 'kpi', 'okr', 'metric', 'benchmark', 'dashboard',
      'process', 'workflow', 'efficiency', 'productivity', 'optimization',
      'stakeholder', 'governance', 'board', 'executive', 'c-suite', 'ceo', 'cfo', 'cto',
      'merger', 'acquisition', 'partnership', 'joint venture', 'alliance',
      'consulting', 'consultant', 'advisory', 'firm', 'practice',
      'project', 'program', 'portfolio', 'initiative', 'roadmap',
      'change management', 'transformation', 'innovation', 'disruption',
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: '⚖️',
    color: '#64748b',
    keywords: [
      'legal', 'law', 'regulation', 'compliance', 'contract', 'agreement',
      'liability', 'intellectual property', 'patent', 'trademark', 'copyright',
      'litigation', 'arbitration', 'dispute', 'clause', 'provision', 'term',
      'privacy', 'gdpr', 'consent', 'data protection', 'confidential',
      'license', 'permit', 'jurisdiction', 'statute', 'ordinance',
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
    color: '#0ea5e9',
    keywords: [
      'analytics', 'analysis', 'insight', 'report', 'dashboard', 'visualization',
      'metric', 'kpi', 'measure', 'track', 'monitor', 'trend',
      'statistics', 'regression', 'correlation', 'hypothesis', 'sample',
      'survey', 'research', 'study', 'finding', 'result', 'outcome',
      'segment', 'cohort', 'attribution', 'a/b test', 'experiment',
      'predict', 'forecast', 'model', 'score', 'rating', 'index',
    ],
  },
  {
    id: 'general',
    label: 'General',
    icon: '📝',
    color: '#a3a3a3',
    keywords: [],
  },
];

/**
 * Classify a term's domain based on its EN name and VI translation.
 * Returns the domain id with highest keyword match score.
 */
export function classifyDomain(termEN, termVI = '') {
  const text = `${termEN} ${termVI}`.toLowerCase();

  let bestDomain = 'general';
  let bestScore = 0;

  for (const domain of DOMAINS) {
    if (domain.id === 'general') continue;
    let score = 0;
    for (const kw of domain.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += kw.length; // longer keyword = stronger signal
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain.id;
    }
  }

  return bestDomain;
}

/**
 * Get domain info by id.
 */
export function getDomainById(id) {
  return DOMAINS.find(d => d.id === id) || DOMAINS.find(d => d.id === 'general');
}

/**
 * Group terms by domain, sorted by domain label then term EN.
 */
export function groupByDomain(terms) {
  const groups = {};
  for (const term of terms) {
    const domain = term.domain || classifyDomain(term.termEN, term.termVI);
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push({ ...term, domain });
  }

  // Sort groups by DOMAINS order, then terms alphabetically within each group
  const ordered = [];
  for (const d of DOMAINS) {
    if (groups[d.id]) {
      ordered.push({
        domain: d,
        terms: groups[d.id].sort((a, b) => (a.termEN || '').localeCompare(b.termEN || '')),
      });
    }
  }
  return ordered;
}
