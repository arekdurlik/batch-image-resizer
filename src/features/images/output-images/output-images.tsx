import { useState, useCallback, useMemo } from 'react'
import { MdMoreHoriz } from 'react-icons/md'
import styled from 'styled-components'
import { compare, removeFileExtension } from '../../../lib/helpers'
import { useOutputImages } from '../../../store/output-images'
import { OutputImageData } from '../../../store/types'
import { useVariants } from '../../../store/variants'
import { SectionHeader, SectionTitle } from '../../layout/styled'
import { Button } from '../../ui/inputs/button'
import { ProgressBar } from '../../ui/progress-bar'
import { ImageList } from '../image-list'
import { Wrapper, ImageListWrapper, ProgressBarWrapper, HeaderOptions } from '../styled'
import { SortOption, SortDirection } from '../types'
import { FilterAndSort } from './filter-and-sort'
import { MoreOptions } from './more-options'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function OutputImages() {
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.FILENAME);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC);
  const [filter, setFilter] = useState('');
  const images = useOutputImages(state => state.images);
  const variants = useVariants(state => state.variants);
  const progress = useOutputImages(state => state.progress);

  const sortingMethod = useCallback((a: OutputImageData, b: OutputImageData) => {
    switch(sortOption) {
      case SortOption.VARIANT: { // VARIANT
        const variantA = variants.find(v => v.id === a.variantId)!;
        const variantB = variants.find(v => v.id === b.variantId)!;

        return sortDirection === SortDirection.ASC
          ? compare(variantA.index, variantB.index) || collator.compare(a.filename, b.filename)
          : compare(variantB.index, variantA.index) || collator.compare(a.filename, b.filename);
      }
      case SortOption.FILESIZE: // FILESIZE
        return sortDirection === SortDirection.ASC 
          ? compare(a.image.full.file.size, b.image.full.file.size)
          : compare(b.image.full.file.size, a.image.full.file.size);
      default: // FILENAME
        return sortDirection === SortDirection.ASC 
          ? collator.compare(removeFileExtension(a.filename), removeFileExtension(b.filename))
          : collator.compare(removeFileExtension(b.filename), removeFileExtension(a.filename));
      }
  }, [sortOption, sortDirection, variants]);

  const sortedImages = useMemo(
    () => [...images].sort(sortingMethod),
    [images, sortingMethod]
  );

  const filteredImages = useMemo(
    () => filter.length 
    ? sortedImages.filter(img => img.filename.includes(filter)) 
    : sortedImages,
    [filter, sortedImages]
  );
 
  return (
    <Wrapper>
      <SectionHeader $borderTop>
        <SectionTitle>Output images</SectionTitle>
        <HeaderOptions>
          <FilterAndSort
            filter={filter}
            sortOption={sortOption}
            sortDirection={sortDirection}
            onFilter={setFilter}
            onSortOptChange={setSortOption}
            onSortDirChange={setSortDirection}
          />
          <MoreOptions/>
        </HeaderOptions>
      </SectionHeader>
      <ImageListWrapper>
        <ProgressBarWrapper>
          <ProgressBar 
            value={progress.processedItems} 
            max={progress.totalItems}
          />
        </ProgressBarWrapper>
        <ImageList
          type='output'
          images={filteredImages} 
          sortBy={sortOption}
          />
      </ImageListWrapper>
    </Wrapper>
  )
}