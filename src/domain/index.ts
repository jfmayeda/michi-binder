export { slotCount } from './sample';
export { LAYOUTS, SLOT_CM, columnSeamOpen, isLeftFacingPage } from './layouts';
export {
  addMerge,
  createBinder,
  unmerge,
  validateMerge,
  switchPageMode,
  cellsForMerge,
  proposalFromSelection,
  adoptPlacementsIntoMerge,
  placeOnMerge,
  placeIntoCell,
  placementFromCard,
  removePlacement,
  placementAt,
} from './slots';
export { computeSplit, assemblyAnnotation } from './split';
export { serializeBinder, deserializeBinder } from './serialize';
