import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EpubReader } from '../components/EpubReader';
import type { EpubReaderRef } from '../components/EpubReader';
import { PdfReader } from '../components/PdfReader';
import type { PdfReaderRef } from '../components/PdfReader';
import { getBook, updateBookProgress } from '../utils/storage';
import type { Book, TocItem } from '../types';

export function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const epubRef = useRef<EpubReaderRef>(null);
  const pdfRef = useRef<PdfReaderRef>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    const loadBook = async () => {
      if (id) {
        const loadedBook = await getBook(id);
        setBook(loadedBook);
      }
    };
    loadBook();
  }, [id]);

  const handleProgress = useCallback((p: number) => {
    setProgress(p);
    if (id) {
      updateBookProgress(id, p);
    }
  }, [id]);

  const handleTocGenerated = useCallback((generatedToc: TocItem[]) => {
    setToc(generatedToc);
  }, []);

  const handleTocClick = useCallback((item: TocItem) => {
    epubRef.current?.goTo(item.href);
    setShowToc(false);
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (book?.fileType === 'epub') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          epubRef.current?.prev();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
          epubRef.current?.next();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book?.fileType]);

  if (!book) {
    return (
      <div className="reader-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="reader-container">
      <div className="header">
        <button className="icon-btn" onClick={handleBack} title="Back">
          ←
        </button>
        <span className="header-title">{book.title}</span>
        <div className="header-actions">
          {book.fileType === 'epub' && (
            <button
              className="icon-btn"
              onClick={() => setShowToc(!showToc)}
              title="Table of Contents"
            >
              ☰
            </button>
          )}
        </div>
      </div>

      <div className="reader-body">
        {book.fileType === 'epub' ? (
          <EpubReader
            ref={epubRef}
            file={book.file}
            onProgress={handleProgress}
            onTocGenerated={handleTocGenerated}
          />
        ) : (
          <PdfReader
            ref={pdfRef}
            file={book.file}
            onProgress={handleProgress}
          />
        )}
      </div>

      {book.fileType === 'epub' && (
        <div className={`toc-panel ${showToc ? 'open' : ''}`}>
          <h3>Table of Contents</h3>
          <ul className="toc-list">
            {toc.length === 0 ? (
              <li className="toc-item" style={{ color: 'var(--text-secondary)' }}>
                No contents available
              </li>
            ) : (
              toc.map((item, index) => (
                <li
                  key={index}
                  className="toc-item"
                  onClick={() => handleTocClick(item)}
                >
                  {item.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="footer">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="page-info">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
