import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import type { DragEvent } from 'react';
import { getAllBooks, saveBook, generateBookId } from '../utils/storage';

export function ShelfPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [isDragover, setIsDragover] = useState(false);

  const loadBooks = useCallback(async () => {
    const allBooks = await getAllBooks();
    setBooks(allBooks);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleFile = useCallback(async (file: File) => {
    const fileType = file.name.toLowerCase().endsWith('.epub')
      ? 'epub'
      : file.name.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : null;

    if (!fileType) {
      alert('Please upload EPUB or PDF files only');
      return;
    }

    const id = generateBookId(file);
    const existingBook = books.find(b => b.id === id);
    if (existingBook) {
      navigate(`/read/${id}`);
      return;
    }

    const book: Book = {
      id,
      title: file.name.replace(/\.(epub|pdf)$/i, ''),
      author: 'Unknown',
      file,
      fileType,
      addedAt: Date.now(),
    };

    await saveBook(book);
    navigate(`/read/${id}`);
  }, [books, navigate]);

  const handleDrop = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragover(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragover(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="shelf-page">
      <div className="shelf-header">
        <h1>My Library</h1>
      </div>

      <label
        className={`upload-area ${isDragover ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".epub,.pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">+</div>
        <p className="upload-text">
          Drop EPUB or PDF files here, or <span>click to upload</span>
        </p>
      </label>

      {books.length === 0 ? (
        <div className="empty-shelf">
          <p>Your library is empty. Add some books to get started!</p>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book) => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => navigate(`/read/${book.id}`)}
            >
              <div className="book-cover">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} />
                ) : (
                  <span>{book.fileType.toUpperCase()}</span>
                )}
              </div>
              <div className="book-info">
                <div className="book-title" title={book.title}>
                  {book.title}
                </div>
                <div className="book-author">{book.author}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
