// Pure, presentation-free helpers for traversing and querying the catalog.
// Previously each of these traversals was re-implemented inline across
// App, ApproverPortal, TableView, AdvancedSearchModal, Create/EditModal.

import { SubjectArea, Entity, DataItem } from '../types';

export interface FlatDataItem {
  dataItem: DataItem;
  entity: Entity;
  subjectArea: SubjectArea;
}

export interface FlatEntity {
  entity: Entity;
  subjectArea: SubjectArea;
}

export const flattenDataItems = (subjectAreas: SubjectArea[]): FlatDataItem[] =>
  subjectAreas.flatMap(sa =>
    sa.entities.flatMap(e => e.dataItems.map(di => ({ dataItem: di, entity: e, subjectArea: sa })))
  );

export const flattenEntities = (subjectAreas: SubjectArea[]): FlatEntity[] =>
  subjectAreas.flatMap(sa => sa.entities.map(e => ({ entity: e, subjectArea: sa })));

export const countEntities = (subjectAreas: SubjectArea[]): number =>
  subjectAreas.reduce((sum, sa) => sum + sa.entities.length, 0);

export const countDataItems = (subjectAreas: SubjectArea[]): number =>
  subjectAreas.reduce((sum, sa) => sum + sa.entities.reduce((s2, e) => s2 + e.dataItems.length, 0), 0);

/** The free-text "quick search" predicate used by Tree/Table/header counts. */
export const matchesQuery = (dataItem: DataItem, query: string): boolean => {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return dataItem.name.toLowerCase().includes(q) || dataItem.businessDefinition.toLowerCase().includes(q);
};

/** Count of data items matching the quick-search query across the catalog. */
export const countMatches = (subjectAreas: SubjectArea[], query: string): number => {
  const q = query.toLowerCase().trim();
  if (!q) return countDataItems(subjectAreas);
  return subjectAreas.reduce((sum, sa) =>
    sum + sa.entities.reduce((s2, e) =>
      s2 + e.dataItems.filter(di => matchesQuery(di, q)).length, 0), 0);
};

export const findEntityById = (subjectAreas: SubjectArea[], entityId: string): FlatEntity | undefined => {
  for (const sa of subjectAreas) {
    const entity = sa.entities.find(e => e.id === entityId);
    if (entity) return { entity, subjectArea: sa };
  }
  return undefined;
};

export const findDataItemById = (subjectAreas: SubjectArea[], dataItemId: string): FlatDataItem | undefined => {
  for (const sa of subjectAreas) {
    for (const entity of sa.entities) {
      const dataItem = entity.dataItems.find(di => di.id === dataItemId);
      if (dataItem) return { dataItem, entity, subjectArea: sa };
    }
  }
  return undefined;
};

/** Keys whose values differ between two records (ignores id / dataItems). */
export const computeChangedFields = (
  original: Record<string, unknown>,
  proposed: Record<string, unknown>,
): string[] => {
  const keys = new Set([...Object.keys(original), ...Object.keys(proposed)]);
  keys.delete('id');
  keys.delete('dataItems');
  return [...keys].filter(k => JSON.stringify(original[k]) !== JSON.stringify(proposed[k]));
};
