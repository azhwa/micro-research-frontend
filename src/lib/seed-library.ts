export interface SeedPack {
  id: string;
  label: string;
  description: string;
  seeds: string[];
}

export const seedPacks: SeedPack[] = [
  { id: 'business', label: 'Business & work', description: 'Commercial people, teamwork, office, and productivity.', seeds: ['remote work', 'business meeting', 'team collaboration', 'startup team', 'leadership', 'office workspace'] },
  { id: 'technology', label: 'Technology & AI', description: 'Digital transformation, AI, cybersecurity, and future tech.', seeds: ['artificial intelligence', 'data privacy', 'cybersecurity', 'digital transformation', 'cloud computing', 'robot technology'] },
  { id: 'wellness', label: 'Wellness & health', description: 'Healthy lifestyle, mental health, fitness, and care.', seeds: ['mental health', 'healthy lifestyle', 'home workout', 'wellness spa', 'healthcare technology', 'mindfulness'] },
  { id: 'sustainability', label: 'Sustainability', description: 'Climate, green business, renewable energy, and ESG.', seeds: ['sustainable business', 'renewable energy', 'climate change', 'green city', 'electric vehicle', 'zero waste'] },
  { id: 'finance', label: 'Finance & money', description: 'Fintech, investment, payments, and financial planning.', seeds: ['personal finance', 'online banking', 'financial planning', 'investment strategy', 'digital payment', 'fintech'] },
  { id: 'lifestyle', label: 'Lifestyle & people', description: 'Everyday life, family, diversity, and modern living.', seeds: ['family lifestyle', 'diverse people', 'work life balance', 'modern home', 'social connection', 'daily routine'] },
  { id: 'travel', label: 'Travel & tourism', description: 'Destinations, transportation, hospitality, and travel planning.', seeds: ['travel planning', 'airport traveler', 'sustainable tourism', 'hotel room', 'city travel', 'beach vacation'] },
  { id: 'food', label: 'Food & nutrition', description: 'Food culture, cooking, delivery, and nutrition.', seeds: ['healthy food', 'food delivery', 'home cooking', 'plant based food', 'coffee shop', 'food preparation'] }
];
