import type { LayoutId, PageMode } from '@/domain/layouts';
import type { Merge, Placement } from '@/domain/types';

export type TemplateCardDisplay = {
  card_id: string;
  name: string;
  set: string;
  number: string;
  imageUrl: string;
};

export type TemplatePlacement = Placement & {
  card?: TemplateCardDisplay | null;
};

export type TemplateFile = {
  version: 1;
  kind: 'starter-binder' | 'page-template';
  id: string;
  title: string;
  draft: true;
  notes: string;
  layoutId: LayoutId;
  pageMode: PageMode;
  pages: { id: string; position: number }[];
  merges: Merge[];
  placements: TemplatePlacement[];
};
