import type { TemplateFile } from '../types';
import starter from './starter-binder.json';
import kanto from './kanto-starters.json';
import eevee from './eevee-desk.json';
import pink from './pink-friends.json';
import legend from './legend-box.json';
import gengar from './gengar-night.json';
import manifest from './manifest.json';

export { manifest };
export const starterBinder = starter as TemplateFile;
export const pageTemplates = [kanto, eevee, pink, legend, gengar] as TemplateFile[];
export const allTemplates = [starter, ...pageTemplates] as TemplateFile[];
