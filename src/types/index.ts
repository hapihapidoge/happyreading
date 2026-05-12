export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  file: File;
  fileType: 'epub' | 'pdf';
  addedAt: number;
  lastReadAt?: number;
  progress?: number;
}

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export interface ReaderState {
  currentLocation: string;
  progress: number;
  totalPages: number;
  currentPage: number;
}
