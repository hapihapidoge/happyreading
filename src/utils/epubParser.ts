import JSZip from 'jszip';

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export interface BookContent {
  title: string;
  author: string;
  cover?: string;
  toc: TocItem[];
  htmlContent: string;
  sections: { href: string; html: string }[];
}

function parseXml(xmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'application/xml');
}

function parseHtml(htmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(htmlString, 'text/html');
}

function getTextContent(element: Element | null, tagName: string): string {
  if (!element) return '';
  const node = element.querySelector(tagName);
  return node?.textContent?.trim() || '';
}

function parseNavToc(navDoc: Document): TocItem[] {
  const toc: TocItem[] = [];
  const navList = navDoc.querySelector('nav[epub\\:type="toc"]');
  if (!navList) return toc;

  const processItem = (li: Element): TocItem | null => {
    const anchor = li.querySelector('a');
    if (!anchor) return null;
    const href = anchor.getAttribute('href') || '';
    const label = anchor.textContent?.trim() || '';
    const item: TocItem = { label, href };

    const subList = li.querySelector(':scope > ol');
    if (subList) {
      const subItems: TocItem[] = [];
      subList.querySelectorAll(':scope > li').forEach((subLi) => {
        const subItem = processItem(subLi);
        if (subItem) subItems.push(subItem);
      });
      if (subItems.length > 0) item.subitems = subItems;
    }

    return item;
  };

  navList.querySelectorAll(':scope > li').forEach((li) => {
    const item = processItem(li);
    if (item) toc.push(item);
  });

  return toc;
}

function parseNcxToc(ncxDoc: Document): TocItem[] {
  const toc: TocItem[] = [];

  const processNavPoint = (navPoint: Element): TocItem | null => {
    const label = getTextContent(navPoint, 'navLabel text');
    const content = navPoint.querySelector('content');
    const href = content?.getAttribute('src') || '';

    if (!label) return null;

    const item: TocItem = { label, href };
    const navList = navPoint.querySelectorAll(':scope > navPoint');
    if (navList.length > 0) {
      const subItems: TocItem[] = [];
      navList.forEach((np) => {
        const subItem = processNavPoint(np);
        if (subItem) subItems.push(subItem);
      });
      item.subitems = subItems;
    }

    return item;
  };

  ncxDoc.querySelectorAll('navMap > navPoint').forEach((np) => {
    const item = processNavPoint(np);
    if (item) toc.push(item);
  });

  return toc;
}

export async function parseEpub(file: File): Promise<BookContent> {
  const zip = await JSZip.loadAsync(file);
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

  const containerDoc = parseXml(containerXml);
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path');
  if (!opfPath) throw new Error('Invalid EPUB: missing OPF path');

  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error('Invalid EPUB: missing OPF file');

  const opfDoc = parseXml(opfXml);
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  const metadata = opfDoc.querySelector('metadata');
  const dcTitle = metadata?.querySelector('dc\\:title, title')?.textContent?.trim() || 'Unknown Title';
  const dcCreator = metadata?.querySelector('dc\\:creator, creator')?.textContent?.trim() || 'Unknown Author';

  let cover: string | undefined;
  const coverMeta = metadata?.querySelector('meta[name="cover"]');
  const coverId = coverMeta?.getAttribute('content');
  if (coverId) {
    const coverItem = opfDoc.querySelector(`item[id="${coverId}"]`);
    if (coverItem) {
      const coverHref = coverItem.getAttribute('href');
      if (coverHref) {
        const coverFile = await zip.file(opfDir + coverHref)?.async('base64');
        if (coverFile) {
          const coverItemFinal = opfDoc.querySelector(`item[id="${coverId}"]`);
          const mediaType = coverItemFinal?.getAttribute('media-type') || 'image/jpeg';
          cover = `data:${mediaType};base64,${coverFile}`;
        }
      }
    }
  }

  if (!cover) {
    const coverItems = opfDoc.querySelectorAll('item[properties*="cover-image"]');
    for (const item of coverItems) {
      const href = item.getAttribute('href');
      if (href) {
        const coverFile = await zip.file(opfDir + href)?.async('base64');
        if (coverFile) {
          const mediaType = item.getAttribute('media-type') || 'image/jpeg';
          cover = `data:${mediaType};base64,${coverFile}`;
          break;
        }
      }
    }
  }

  let toc: TocItem[] = [];
  const ncxItem = opfDoc.querySelector('item[media-type="application/x-dtbncx+xml"]');
  if (ncxItem) {
    const ncxPath = opfDir + ncxItem.getAttribute('href');
    const ncxXml = await zip.file(ncxPath)?.async('text');
    if (ncxXml) {
      toc = parseNcxToc(parseXml(ncxXml));
    }
  }

  if (toc.length === 0) {
    const navItems = opfDoc.querySelectorAll('item[media-type="application/xhtml+xml"]');
    for (const item of navItems) {
      const href = item.getAttribute('href');
      if (href) {
        const navFile = await zip.file(opfDir + href)?.async('text');
        if (navFile) {
          const navDoc = parseHtml(navFile);
          if (navDoc.querySelector('nav[epub\\:type="toc"]')) {
            toc = parseNavToc(navDoc);
            break;
          }
        }
      }
    }
  }

  const spineItems = opfDoc.querySelectorAll('spine > itemref');
  const manifest: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest[id] = href;
  });

  const sections: { href: string; html: string }[] = [];
  const hrefToSectionIndex: Record<string, number> = {};

  for (const itemref of spineItems) {
    const idref = itemref.getAttribute('idref');
    if (!idref || !manifest[idref]) continue;

    const htmlPath = opfDir + manifest[idref];
    const htmlContent = await zip.file(htmlPath)?.async('text');
    if (!htmlContent) continue;

    const htmlDoc = parseHtml(htmlContent);
    const body = htmlDoc.querySelector('body');
    if (!body) continue;

    const href = manifest[idref];
    hrefToSectionIndex[href] = sections.length;
    sections.push({ href, html: body.innerHTML });
  }

  const combinedHtml = sections.map((s) => s.html).join('\n<div class="section-break"></div>\n');

  return {
    title: dcTitle,
    author: dcCreator,
    cover,
    toc,
    htmlContent: combinedHtml,
    sections,
  };
}
