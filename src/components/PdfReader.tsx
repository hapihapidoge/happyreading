import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PdfReaderRef {
  goToPage: (pageNum: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  getCurrentPage: () => number;
  getTotalPages: () => number;
}

interface PdfReaderProps {
  file: File;
  onProgress?: (progress: number) => void;
}

export const PdfReader = forwardRef<PdfReaderRef, PdfReaderProps>(
  ({ file, onProgress }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    const currentPageRef = useRef(1);
    const [, forceUpdate] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const getCurrentPage = useCallback(() => currentPageRef.current, []);
    const getTotalPages = useCallback(() => totalPages, [totalPages]);

    useImperativeHandle(ref, () => ({
      goToPage,
      nextPage,
      prevPage,
      getCurrentPage,
      getTotalPages,
    }));

    const updateProgress = useCallback(() => {
      onProgress?.(Math.round((currentPageRef.current / totalPages) * 100));
    }, [totalPages, onProgress]);

    const goToPage = useCallback(async (pageNum: number) => {
      if (!pdfDocRef.current || !containerRef.current) return;
      const num = Math.max(1, Math.min(pageNum, totalPages));
      currentPageRef.current = num;
      await renderPage(num);
      forceUpdate(n => n + 1);
    }, [totalPages]);

    const nextPage = useCallback(() => {
      goToPage(currentPageRef.current + 1);
    }, [goToPage]);

    const prevPage = useCallback(() => {
      goToPage(currentPageRef.current - 1);
    }, [goToPage]);

    const renderPage = useCallback(async (pageNum: number): Promise<void> => {
      if (!pdfDocRef.current || !containerRef.current) return;

      const page: PDFPageProxy = await pdfDocRef.current.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const existingCanvas = containerRef.current.querySelector('canvas');
      const canvas = existingCanvas || document.createElement('canvas');
      const context = canvas.getContext('2d')!;

      if (!existingCanvas) {
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        containerRef.current.appendChild(canvas);
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      updateProgress();
    }, [updateProgress]);

    useEffect(() => {
      const loadPdf = async () => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        await renderPage(1);
      };

      loadPdf();

      return () => {
        pdfDocRef.current?.destroy();
      };
    }, [file, renderPage]);

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        if (x < width / 3) {
          prevPage();
        } else if (x > (width * 2) / 3) {
          nextPage();
        }
      };

      const container = containerRef.current;
      if (container) {
        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
      }
    }, [nextPage, prevPage]);

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'auto',
          background: '#1a1a1a',
          padding: '20px',
          cursor: 'pointer',
        }}
      />
    );
  }
);
