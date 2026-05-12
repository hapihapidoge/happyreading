import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { parseEpub } from '../utils/epubParser';
import type { BookContent, TocItem } from '../utils/epubParser';

export interface EpubReaderRef {
  goTo: (href: string) => void;
  next: () => void;
  prev: () => void;
}

interface EpubReaderProps {
  file: File;
  onProgress?: (progress: number) => void;
  onTocGenerated?: (toc: TocItem[]) => void;
}

function flattenToc(toc: TocItem[]): TocItem[] {
  const result: TocItem[] = [];
  toc.forEach((item) => {
    result.push(item);
    if (item.subitems) {
      result.push(...flattenToc(item.subitems));
    }
  });
  return result;
}

export const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  ({ file, onProgress, onTocGenerated }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [bookData, setBookData] = useState<BookContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentSection, setCurrentSection] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const totalSections = bookData?.sections.length || 1;

    const next = useCallback(() => {
      if (currentSection < totalSections - 1) {
        setCurrentSection((prev) => prev + 1);
      }
    }, [currentSection, totalSections]);

    const prev = useCallback(() => {
      if (currentSection > 0) {
        setCurrentSection((prev) => prev - 1);
      }
    }, [currentSection]);

    const goTo = useCallback((href: string) => {
      if (!bookData) return;

      const hrefOnly = href.split('#')[0];
      const sectionIndex = bookData.sections.findIndex((s) => {
        return s.href === hrefOnly || s.href.endsWith(hrefOnly) || hrefOnly.endsWith(s.href);
      });

      if (sectionIndex !== -1) {
        setCurrentSection(sectionIndex);
      }
    }, [bookData]);

    useImperativeHandle(ref, () => ({
      goTo,
      next,
      prev,
    }));

    useEffect(() => {
      const loadBook = async () => {
        try {
          const data = await parseEpub(file);
          setBookData(data);
          if (onTocGenerated) {
            onTocGenerated(flattenToc(data.toc));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load book');
        }
      };
      loadBook();
    }, [file, onTocGenerated]);

    useEffect(() => {
      if (bookData && totalSections > 0) {
        const progress = Math.round(((currentSection + 1) / totalSections) * 100);
        onProgress?.(progress);
      }
    }, [currentSection, totalSections, onProgress, bookData]);

    useEffect(() => {
      const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight <= clientHeight) return;
        const progress = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
        onProgress?.(progress);
      };

      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
    }, [onProgress]);

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      if (x < width / 3) {
        prev();
      } else if (x > (width * 2) / 3) {
        next();
      }
    }, [next, prev]);

    if (error) {
      return (
        <div style={{ padding: '20px', color: '#e8d5b7' }}>
          Error: {error}
        </div>
      );
    }

    if (!bookData) {
      return (
        <div style={{ padding: '20px', color: '#e8d5b7' }}>
          Loading...
        </div>
      );
    }

    const currentHtml = bookData.sections[currentSection]?.html || '';

    return (
      <div
        ref={containerRef}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1a1a',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        <div
          ref={scrollContainerRef}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
          }}
        >
          <div
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: currentHtml }}
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: '40px 20px',
              background: '#1a1a1a',
              color: '#e8d5b7',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.8',
              fontSize: '16px',
            }}
          />
        </div>
      </div>
    );
  }
);
