import localforage from 'localforage';
import type { Book } from '../types';

const bookStore = localforage.createInstance({
  name: 'happyreading',
  storeName: 'books',
});

export const saveBook = async (book: Book): Promise<void> => {
  await bookStore.setItem(book.id, book);
};

export const getBook = async (id: string): Promise<Book | null> => {
  return await bookStore.getItem(id);
};

export const getAllBooks = async (): Promise<Book[]> => {
  const books: Book[] = [];
  await bookStore.iterate((value: Book) => {
    books.push(value);
  });
  return books.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || b.addedAt));
};

export const deleteBook = async (id: string): Promise<void> => {
  await bookStore.removeItem(id);
};

export const updateBookProgress = async (id: string, progress: number): Promise<void> => {
  const book = await getBook(id);
  if (book) {
    book.progress = progress;
    book.lastReadAt = Date.now();
    await saveBook(book);
  }
};

export const generateBookId = (file: File): string => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};
