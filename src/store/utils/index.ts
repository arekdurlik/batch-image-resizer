import { SelectedItem } from '../types'
import { useVariants } from '../variants'

export * from './progress'
export * from './process-image'

export function switchedType(items1: SelectedItem[], items2: SelectedItem[]) {
  return items1[0]?.type && items2[0]?.type && items1[0].type !== items2[0].type;
}

export function getVariantsWithIdCheck(variantId: string) {
  const variants = [...useVariants.getState().variants];
  const index = variants.findIndex(v => v.id === variantId);

  if (index === undefined) {
    throw new Error(`Variant with id "${variantId}" not found.`);
  }

  return { variants, variant: variants[index], index };
}