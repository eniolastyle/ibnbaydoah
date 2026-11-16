import React, { useState, useEffect, useMemo } from 'react';
import { Book } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Pagination } from './Pagination';
import { getShareableUrl, copyShareUrl } from '../utils/routing';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  MessageCircle,
  Clock,
  Layers,
  Sparkles,
  Info,
  ShoppingBag,
  Share2,
  Check,
  Plus,
  Minus,
  MapPin,
  Copy,
  CheckCircle2,
  Truck
} from 'lucide-react';

interface LibraryExplorerProps {
  books: Book[];
  categories: string[];
  whatsappNumber: string;
  initialBookId?: string | null;
  onSelectBook?: (bookId: string | null) => void;
}

const BUYER_PREFS_KEY = 'ibn_baydoah_buyer_prefs';

function loadBuyerPrefs(): { name: string; city: string } {
  if (typeof window === 'undefined') return { name: '', city: '' };
  try {
    const raw = localStorage.getItem(BUYER_PREFS_KEY);
    if (!raw) return { name: '', city: '' };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
    };
  } catch {
    return { name: '', city: '' };
  }
}

function computeOrderTotal(priceStr: string | undefined, qty: number): string | null {
  const raw = (priceStr || '').trim();
  if (!raw) return null;
  // Normalize Arabic-Indic digits if any
  const normalized = raw.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const match = normalized.match(/^([^\d]*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const prefix = match[1].trim();
  const numeric = parseFloat(match[2].replace(/,/g, ''));
  const suffix = match[3].trim();
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const total = numeric * qty;
  const formattedNumber = Number.isInteger(total)
    ? total.toLocaleString('en-US')
    : total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [prefix, formattedNumber, suffix].filter(Boolean).join(prefix && !suffix ? '' : ' ').trim();
}

export const LibraryExplorer: React.FC<LibraryExplorerProps> = ({
  books,
  categories,
  whatsappNumber,
  initialBookId = null,
  onSelectBook
}) => {
  const { lang, t, translateCategory, translateStatus } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'مطبوع' | 'مخطوط'>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [copiedBookId, setCopiedBookId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Enhanced Paid Book Order Modal State
  const [orderModalBook, setOrderModalBook] = useState<Book | null>(null);
  const [buyerName, setBuyerName] = useState(() => loadBuyerPrefs().name);
  const [orderFormat, setOrderFormat] = useState<'print' | 'pdf'>('print');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [cityAddress, setCityAddress] = useState(() => loadBuyerPrefs().city);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);

  const PAGE_SIZE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, statusFilter, pricingFilter, searchQuery, books.length]);

  useEffect(() => {
    if (!initialBookId) {
      setActiveBook(null);
      return;
    }
    const found = books.find(b => b.id === initialBookId);
    if (found) {
      setActiveBook(found);
    }
  }, [initialBookId, books]);

  const handleOpenBook = (book: Book) => {
    setActiveBook(book);
    onSelectBook?.(book.id);
  };

  const handleCloseBook = () => {
    setActiveBook(null);
    onSelectBook?.(null);
  };

  const handleOpenOrderModal = (book: Book, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveBook(null);
    setOrderModalBook(book);
    setOrderFormat(book.status !== 'مطبوع' && book.hasPdf ? 'pdf' : 'print');
    setQuantity(1);
    setOrderNotes('');
    setOrderError('');
    setOrderSubmitted(false);
    setOrderCopied(false);
  };

  const handleCloseOrderModal = () => {
    setOrderModalBook(null);
    setOrderError('');
    setOrderSubmitted(false);
  };

  const handleShareBook = async (book: Book, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = getShareableUrl({ tab: 'library', itemId: book.id });
    const copied = await copyShareUrl(url);
    if (copied) {
      setCopiedBookId(book.id);
      setTimeout(() => setCopiedBookId(prev => (prev === book.id ? null : prev)), 2200);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesCategory =
      selectedCategory === 'all' || book.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'all' || book.status === statusFilter;
    const matchesPricing =
      pricingFilter === 'all' ||
      (pricingFilter === 'paid' ? Boolean(book.isPaid) : !book.isPaid);
    const matchesSearch =
      !searchQuery.trim() ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.subtitle && book.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesStatus && matchesPricing && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBooks = filteredBooks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const sanitizedWhatsapp = (whatsappNumber || '').replace(/[^0-9]/g, '');

  const generateWhatsAppLink = (book: Book) => {
    const msg = encodeURIComponent(
      lang === 'ar'
        ? `السلام عليكم ورحمة الله وبركاته فضيلة الشيخ أبي سعيد ابن بيضاء.\nأرغب في الاستفسار وطلب نسخة من مصنفكم: «${book.title}» (${book.category} - ${book.status}).\nجزاكم الله خيراً.`
        : `As-Salāmu ‘alaykum wa Raḥmatullāhi wa Barakātuh, Ustādh Abu Sa'eed.\nI would like to inquire about your treatise: «${book.title}» (${book.category} - ${book.status}).\nMay Allah bless you and benefit through your knowledge.`
    );
    return `https://wa.me/${sanitizedWhatsapp}?text=${msg}`;
  };

  const estimatedTotal = useMemo(() => {
    if (!orderModalBook) return null;
    return computeOrderTotal(orderModalBook.price, quantity);
  }, [orderModalBook, quantity]);

  const formattedOrderMessage = useMemo(() => {
    if (!orderModalBook) return '';
    const formatLabel =
      orderFormat === 'pdf'
        ? lang === 'ar'
          ? 'نسخة رقمية (PDF)'
          : 'Digital Edition (PDF)'
        : lang === 'ar'
        ? 'نسخة ورقية مطبوعة'
        : 'Printed Physical Copy';

    const fulfillmentLine =
      orderFormat === 'pdf'
        ? lang === 'ar'
          ? 'طريقة الاستلام: إرسال رابط/ملف PDF بعد التأكيد'
          : 'Delivery: Digital PDF delivery upon confirmation'
        : deliveryMethod === 'pickup'
        ? lang === 'ar'
          ? 'طريقة الاستلام: استلام مباشر من مركز الإمام سيبويه (إلورن)'
          : 'Fulfillment: Direct pickup at Markaz Sībawayh (Ilorin)'
        : lang === 'ar'
        ? `طريقة الاستلام: شحن وتوصيل إلى (${cityAddress.trim() || 'سيتم تحديد العنوان'})`
        : `Fulfillment: Delivery / Shipping to (${cityAddress.trim() || 'Address TBD'})`;

    const unitPriceDisplay = orderModalBook.price
      ? orderModalBook.price
      : t('quoted_on_whatsapp');
    const subtotalLine = estimatedTotal
      ? lang === 'ar'
        ? `الإجمالي التقديري: ${estimatedTotal}`
        : `Estimated Subtotal: ${estimatedTotal}`
      : '';

    if (lang === 'ar') {
      return [
        'السلام عليكم ورحمة الله وبركاته،',
        'أرغب في طلب كتاب من منصة الشيخ أبي سعيد ابن بيضاء العلمية:',
        `• اسم الكتاب: «${orderModalBook.title}»`,
        `• الفن / الحالة: ${orderModalBook.category} (${orderModalBook.status})`,
        `• الصيغة المطلوبة: ${formatLabel}`,
        `• عدد النسخ: ${quantity}`,
        `• سعر النسخة: ${unitPriceDisplay}`,
        subtotalLine ? `• ${subtotalLine}` : '',
        `• الاسم: ${buyerName.trim() || 'غير محدد'}`,
        `• ${fulfillmentLine}`,
        orderNotes.trim() ? `• ملاحظات: ${orderNotes.trim()}` : '',
        '',
        'جزاكم الله خيراً، أرجو تأكيد التوفر وتفاصيل السداد.',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      'As-Salāmu ‘alaykum wa Raḥmatullāhi wa Barakātuh,',
      'I would like to place a book order from Ibn Baydoah Platform:',
      `• Book Title: "${orderModalBook.title}"`,
      `• Category / Status: ${translateCategory(orderModalBook.category)} (${translateStatus(orderModalBook.status)})`,
      `• Format: ${formatLabel}`,
      `• Quantity: ${quantity}`,
      `• Unit Price: ${unitPriceDisplay}`,
      subtotalLine ? `• ${subtotalLine}` : '',
      `• Customer Name: ${buyerName.trim() || 'Not specified'}`,
      `• ${fulfillmentLine}`,
      orderNotes.trim() ? `• Notes: ${orderNotes.trim()}` : '',
      '',
      'Please confirm availability and payment instructions. BarakAllahu feekum.',
    ]
      .filter(Boolean)
      .join('\n');
  }, [
    orderModalBook,
    orderFormat,
    quantity,
    deliveryMethod,
    cityAddress,
    buyerName,
    orderNotes,
    estimatedTotal,
    lang,
    t,
    translateCategory,
    translateStatus,
  ]);

  const validateAndPrepareOrder = (): boolean => {
    if (!buyerName.trim() || buyerName.trim().length < 2) {
      setOrderError(
        lang === 'ar'
          ? 'يرجى كتابة اسمك الكامل لتجهيز الطلب.'
          : 'Please enter your full name to prepare the order.'
      );
      return false;
    }
    if (orderFormat === 'print' && deliveryMethod === 'shipping' && cityAddress.trim().length < 3) {
      setOrderError(
        lang === 'ar'
          ? 'يرجى تحديد المدينة وعنوان التوصيل أو اختيار الاستلام من المركز.'
          : 'Please enter your delivery city/address or choose Markaz pickup.'
      );
      return false;
    }
    setOrderError('');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          BUYER_PREFS_KEY,
          JSON.stringify({ name: buyerName.trim(), city: cityAddress.trim() })
        );
      } catch {
        // ignore storage quota errors
      }
    }
    return true;
  };

  const handleCopyOrder = async () => {
    if (!validateAndPrepareOrder()) return;
    try {
      await navigator.clipboard.writeText(formattedOrderMessage);
      setOrderCopied(true);
      setTimeout(() => setOrderCopied(false), 2400);
    } catch {
      setOrderError(
        lang === 'ar'
          ? 'تعذر النسخ التلقائي، يمكنك تحديد النص ونسخه.'
          : 'Could not access clipboard automatically.'
      );
    }
  };

  const whatsappOrderHref = sanitizedWhatsapp
    ? `https://wa.me/${sanitizedWhatsapp}?text=${encodeURIComponent(formattedOrderMessage)}`
    : '#';

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'العقيدة والتوحيد':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'الفقه وأصوله':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'الحديث وعلومه':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'النحو والصرف':
        return 'bg-emerald-50 text-[#0F382C] border-[#0F382C]/30';
      case 'الأدب والبلاغة واللغة':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'التفسير وعلوم القرآن':
        return 'bg-teal-50 text-teal-900 border-teal-200';
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* Explorer Header */}
      <div className="bg-[#0F382C] text-[#FDFBF7] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-arabesque-dark opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#DFC7A5] text-xs font-readex">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-semibold">{t('library_header_badge')}</span>
          </div>
          <h2 className="font-amiri font-bold text-3xl sm:text-4xl text-[#FDFBF7]">
            {t('library_header_title')}
          </h2>
          <p className="font-naskh text-[#DFC7A5]/90 text-sm sm:text-base leading-[2.1]">
            {t('library_header_desc')}
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl border border-[#E8DCC9] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-11 pr-4 py-3.5 text-xs sm:text-sm rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 focus:border-[#0F382C] text-[#1E1E1E] font-readex"
          />
          <Search className="w-4 h-4 text-[#A58455] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Science Category Badges Filter (Al-Funun) */}
        <div>
          <div className="text-xs text-[#8C6D3B] font-readex font-bold mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span>{t('filter_by_science')}</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-readex font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-[#0F382C] text-white shadow-xs font-bold'
                  : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20'
              }`}
            >
              {t('all_categories')} ({books.length})
            </button>
            {categories.map(cat => {
              const count = books.filter(b => b.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-readex font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-[#0F382C] text-white shadow-xs font-bold'
                      : 'bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/20'
                  }`}
                >
                  {translateCategory(cat)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter (Printed vs Manuscript) */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3.5 pt-4 border-t border-[#E8DCC9] text-xs font-readex">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
            <span className="text-[#8C6D3B] font-bold shrink-0">{t('filter_by_status')}:</span>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] p-1.5 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-initial text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs transition whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('all_statuses')}
              </button>
              <button
                onClick={() => setStatusFilter('مطبوع')}
                className={`flex-1 sm:flex-initial text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs transition whitespace-nowrap ${
                  statusFilter === 'مطبوع'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('printed')}
              </button>
              <button
                onClick={() => setStatusFilter('مخطوط')}
                className={`flex-1 sm:flex-initial text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs transition whitespace-nowrap ${
                  statusFilter === 'مخطوط'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('manuscript')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[#E0D4C1] bg-[#FDFBF7] p-1">
              <button
                onClick={() => setPricingFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                  pricingFilter === 'all'
                    ? 'bg-[#0F382C] text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('all_pricing')}
              </button>
              <button
                onClick={() => setPricingFilter('free')}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                  pricingFilter === 'free'
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('free_book')}
              </button>
              <button
                onClick={() => setPricingFilter('paid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                  pricingFilter === 'paid'
                    ? 'bg-[#C5A880] text-[#0F382C] font-bold shadow-xs'
                    : 'text-[#1E1E1E] hover:bg-[#F4EFE6]'
                }`}
              >
                {t('paid_book')}
              </button>
            </div>

            <div className="text-xs text-[#8C6D3B] font-medium">
              {t('showing_count')} {filteredBooks.length} {t('of_total')} {books.length} {t('books_unit')}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Availability Non-Blocking Notice */}
      {pdfNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-readex flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{pdfNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfNotice(null)}
            className="px-2.5 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-950 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {filteredBooks.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-16 text-center border border-[#E8DCC9] shadow-xs">
            <BookOpen className="w-12 h-12 text-[#C5A880] mx-auto mb-4 opacity-60" />
            <h3 className="font-amiri font-bold text-2xl text-[#0F382C] mb-2">
              {t('no_books_found')}
            </h3>
            <p className="text-xs text-[#8C6D3B] font-readex">
              {t('no_books_found_desc')}
            </p>
          </div>
        ) : (
          paginatedBooks.map(book => {
            const isPrinted = book.status === 'مطبوع';

            return (
              <div
                key={book.id}
                className="bg-white rounded-3xl border border-[#E8DCC9] shadow-[0_2px_12px_-2px_rgba(15,56,44,0.04)] hover:shadow-lg hover:border-[#0F382C]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Book Card Top Banner */}
                <div className="p-6 sm:p-8 pb-4">
                  {/* Category & Status Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-readex font-medium px-2.5 py-1 rounded-md border ${getCategoryColor(
                        book.category
                      )}`}
                    >
                      {translateCategory(book.category)}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-readex font-bold px-2 py-0.5 rounded border ${
                          book.isPaid
                            ? 'bg-[#FAF3E3] text-[#8C5B15] border-[#C5A880]'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {book.isPaid
                          ? book.price
                            ? `${t('paid_book')} • ${book.price}`
                            : t('paid_book')
                          : t('free_book')}
                      </span>

                      <span
                        className={`text-[11px] font-readex font-bold px-2 py-0.5 rounded border ${
                          isPrinted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {translateStatus(book.status)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="font-amiri font-bold text-2xl text-[#0F382C] mb-1.5 group-hover:text-[#164E3D] transition">
                    {book.title}
                  </h3>

                  {book.collaborative && (
                    <div className="text-[11px] font-readex text-[#A58455] font-semibold mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#C5A880]" />
                      <span>{lang === 'ar' ? (book.collaborators || 'بالمشاركة العلمية') : 'Collaborative Scholarly Work'}</span>
                    </div>
                  )}

                  {book.subtitle && (
                    <p className="text-xs font-readex text-[#A58455] mb-3 line-clamp-1">
                      {book.subtitle}
                    </p>
                  )}

                  {/* Description */}
                  <p className="font-naskh text-sm text-[#2D332F] leading-[2.1] line-clamp-3 mb-5">
                    {book.description}
                  </p>

                  {/* Book Metadata details */}
                  <div className="flex items-center gap-4 text-xs font-readex text-[#6B7570] pt-4 border-t border-[#E8DCC9]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#A58455]" />
                      <span>{book.pages} {t('pages')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#A58455]" />
                      <span>{book.year}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="p-4 sm:p-5 bg-[#FAF6EE] border-t border-[#E8DCC9] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenBook(book)}
                      className="text-xs font-readex text-[#0F382C] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>{t('treatise_details')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShareBook(book, e)}
                      className="p-1.5 rounded-lg text-[#8C6D3B] hover:text-[#0F382C] hover:bg-white border border-transparent hover:border-[#E0D4C1] transition"
                      title={t('share_book')}
                      aria-label={t('share_book')}
                    >
                      {copiedBookId === book.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {book.isPaid ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenOrderModal(book, e)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#C5A880] text-[#0F382C] hover:bg-[#DFC7A5] text-xs font-readex font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{t('order_book')}</span>
                      </button>
                    ) : book.hasPdf ? (
                      <a
                        href={book.downloadUrl || '#'}
                        onClick={e => {
                          if (!book.downloadUrl || book.downloadUrl === '#') {
                            e.preventDefault();
                            setPdfNotice(
                              lang === 'ar'
                                ? `سيتم إتاحة النسخة الرقمية لكتاب «${book.title}» قريباً بإذن الله`
                                : `The digital PDF edition for "${book.title}" will be released shortly inshā'Allāh`
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0F382C] text-[#FDFBF7] hover:bg-[#164E3D] text-xs font-readex flex items-center gap-1 shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-[#DFC7A5]" />
                        <span>{t('download_pdf')}</span>
                      </a>
                    ) : (
                      <a
                        href={generateWhatsAppLink(book)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#C5A880]/20 hover:bg-[#C5A880]/40 text-[#0F382C] border border-[#C5A880]/50 text-xs font-readex flex items-center gap-1 transition"
                        title={t('request_manuscript')}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{lang === 'ar' ? 'طلب المخطوط' : 'Request Manuscript'}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Pagination
        currentPage={safePage}
        totalItems={filteredBooks.length}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Book Detailed Modal */}
      {activeBook && (
        <div
          onClick={handleCloseBook}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border-2 border-[#C5A880] shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-readex px-2.5 py-1 rounded bg-[#0F382C]/10 text-[#0F382C] border border-[#C5A880]/40 font-semibold">
                    {translateCategory(activeBook.category)} • {translateStatus(activeBook.status)}
                  </span>
                  <span
                    className={`text-xs font-readex px-2.5 py-1 rounded border font-bold ${
                      activeBook.isPaid
                        ? 'bg-[#FAF3E3] text-[#8C5B15] border-[#C5A880]'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {activeBook.isPaid
                      ? activeBook.price
                        ? `${t('paid_book')} • ${activeBook.price}`
                        : t('paid_book')
                      : t('free_book')}
                  </span>
                </div>
                <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-[#0F382C] mt-2">
                  {activeBook.title}
                </h3>
                {activeBook.subtitle && (
                  <p className="text-sm text-[#A58455] font-readex mt-1">
                    {activeBook.subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseBook}
                aria-label={t('close_modal')}
                className="w-8 h-8 rounded-full bg-[#F4EFE6] text-[#0F382C] hover:bg-[#C5A880]/30 flex items-center justify-center text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6 font-naskh text-[#1E1E1E]">
              <div className="p-4 rounded-xl bg-white border border-[#C5A880]/30 text-sm leading-relaxed">
                {activeBook.description}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-readex">
                <div className="p-3 rounded-lg bg-[#F4EFE6] text-center">
                  <span className="text-[#A58455] block">{t('pages')}</span>
                  <span className="font-bold text-[#0F382C] text-sm">{activeBook.pages} {t('pages')}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F4EFE6] text-center">
                  <span className="text-[#A58455] block">{t('year')}</span>
                  <span className="font-bold text-[#0F382C] text-sm">{activeBook.year}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F4EFE6] text-center col-span-2 sm:col-span-1">
                  <span className="text-[#A58455] block">{t('filter_by_status')}</span>
                  <span className="font-bold text-[#0F382C] text-sm">{translateStatus(activeBook.status)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#C5A880]/30 font-readex text-xs">
              <button
                type="button"
                onClick={() => handleShareBook(activeBook)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#C5A880]/50 text-[#0F382C] hover:bg-[#F4EFE6] flex items-center gap-1.5 font-semibold transition"
              >
                {copiedBookId === activeBook.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{t('link_copied')}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#A58455]" />
                    <span>{t('share_book')}</span>
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  onClick={handleCloseBook}
                  className="px-4 py-2 rounded-xl text-[#1E1E1E] hover:bg-[#F4EFE6]"
                >
                  {t('close_modal')}
                </button>
                {activeBook.isPaid ? (
                  <button
                    type="button"
                    onClick={(e) => handleOpenOrderModal(activeBook, e)}
                    className="px-5 py-2.5 rounded-xl bg-[#C5A880] text-[#0F382C] font-bold flex items-center gap-1.5 shadow hover:bg-[#DFC7A5]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t('order_via_whatsapp')}</span>
                  </button>
                ) : (
                  <>
                    {activeBook.hasPdf && (
                      <a
                        href={activeBook.downloadUrl || '#'}
                        onClick={e => {
                          if (!activeBook.downloadUrl || activeBook.downloadUrl === '#') {
                            e.preventDefault();
                            setPdfNotice(
                              lang === 'ar'
                                ? `سيتم إتاحة النسخة الرقمية لكتاب «${activeBook.title}» قريباً بإذن الله`
                                : `The digital PDF edition for "${activeBook.title}" will be released shortly inshā'Allāh`
                            );
                            handleCloseBook();
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#0F382C] text-white flex items-center gap-1.5 shadow hover:bg-[#164E3D]"
                      >
                        <Download className="w-4 h-4 text-[#DFC7A5]" />
                        <span>{t('download_pdf')}</span>
                      </a>
                    )}
                    <a
                      href={generateWhatsAppLink(activeBook)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-[#F4EFE6] text-[#0F382C] border border-[#C5A880]/50 flex items-center gap-1.5 hover:bg-[#C5A880]/20"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-700" />
                      <span>{t('whatsapp_request')}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Paid Book Ordering Modal */}
      {orderModalBook && (
        <div
          onClick={handleCloseOrderModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full border-2 border-[#C5A880] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="bg-[#0F382C] text-[#FDFBF7] px-6 sm:px-8 py-5 flex items-start justify-between gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-arabesque-dark opacity-25 pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-readex text-[#DFC7A5] font-semibold mb-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('order_modal_title')}</span>
                </div>
                <h3 className="font-amiri font-bold text-2xl sm:text-3xl text-white">
                  {orderModalBook.title}
                </h3>
                <p className="text-xs font-readex text-[#DFC7A5]/90 mt-1">
                  {t('order_modal_subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseOrderModal}
                aria-label={t('close_modal')}
                className="relative z-10 w-8 h-8 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto font-readex text-xs">
              {/* Price & Totals Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8DCC9]">
                <div>
                  <span className="text-[#8C6D3B] block mb-0.5">{t('unit_price_label')}</span>
                  <span className="font-bold text-[#0F382C] text-base">
                    {orderModalBook.price || t('quoted_on_whatsapp')}
                  </span>
                </div>
                <div className="sm:text-end">
                  <span className="text-[#8C6D3B] block mb-0.5">{t('estimated_total_label')}</span>
                  <span className="font-bold text-[#8C5B15] text-base">
                    {estimatedTotal ||
                      (orderModalBook.price
                        ? `${orderModalBook.price} × ${quantity}`
                        : t('quoted_on_whatsapp'))}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#0F382C] mb-1.5">
                    {t('customer_name_label')} *
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => {
                      setBuyerName(e.target.value);
                      if (orderError) setOrderError('');
                    }}
                    placeholder={t('customer_name_placeholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 text-sm"
                  />
                </div>

                {/* Quantity Stepper */}
                <div>
                  <label className="block font-bold text-[#0F382C] mb-1.5">
                    {t('quantity_label')}
                  </label>
                  <div className="inline-flex items-center justify-between w-full px-2 py-1.5 rounded-xl border border-[#E0D4C1] bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] flex items-center justify-center disabled:opacity-40 transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-base text-[#0F382C] px-4">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(50, q + 1))}
                      disabled={quantity >= 50}
                      className="w-8 h-8 rounded-lg bg-[#F4EFE6] hover:bg-[#E8DCC9] text-[#0F382C] flex items-center justify-center disabled:opacity-40 transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Edition Format Selector */}
              <div>
                <label className="block font-bold text-[#0F382C] mb-1.5">
                  {t('edition_format_label')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOrderFormat('print')}
                    className={`p-3 rounded-xl border text-start transition flex items-center gap-2.5 ${
                      orderFormat === 'print'
                        ? 'bg-[#0F382C] text-white border-[#0F382C] font-bold shadow-xs'
                        : 'bg-white text-[#1E1E1E] border-[#E0D4C1] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{t('format_print')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFormat('pdf')}
                    className={`p-3 rounded-xl border text-start transition flex items-center gap-2.5 ${
                      orderFormat === 'pdf'
                        ? 'bg-[#0F382C] text-white border-[#0F382C] font-bold shadow-xs'
                        : 'bg-white text-[#1E1E1E] border-[#E0D4C1] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>{t('format_pdf')}</span>
                  </button>
                </div>
              </div>

              {/* Delivery / Pickup Selector (for Physical Print) */}
              {orderFormat === 'print' && (
                <div className="space-y-3">
                  <label className="block font-bold text-[#0F382C]">
                    {t('delivery_method_label')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('shipping')}
                      className={`p-3 rounded-xl border text-start transition flex items-center gap-2 ${
                        deliveryMethod === 'shipping'
                          ? 'bg-[#FAF3E3] text-[#0F382C] border-[#C5A880] font-bold'
                          : 'bg-white text-[#1E1E1E] border-[#E0D4C1] hover:bg-[#F4EFE6]'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-[#A58455] shrink-0" />
                      <span>{t('delivery_shipping')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-3 rounded-xl border text-start transition flex items-center gap-2 ${
                        deliveryMethod === 'pickup'
                          ? 'bg-[#FAF3E3] text-[#0F382C] border-[#C5A880] font-bold'
                          : 'bg-white text-[#1E1E1E] border-[#E0D4C1] hover:bg-[#F4EFE6]'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-[#A58455] shrink-0" />
                      <span>{t('delivery_pickup')}</span>
                    </button>
                  </div>

                  {deliveryMethod === 'shipping' && (
                    <div>
                      <label className="block font-bold text-[#0F382C] mb-1.5">
                        {t('city_address_label')} *
                      </label>
                      <input
                        type="text"
                        value={cityAddress}
                        onChange={e => {
                          setCityAddress(e.target.value);
                          if (orderError) setOrderError('');
                        }}
                        placeholder={t('city_address_placeholder')}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D4C1] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Additional Notes */}
              <div>
                <label className="block font-bold text-[#0F382C] mb-1.5">
                  {t('order_notes_label')}
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder={t('order_notes_placeholder')}
                  className="w-full p-3 rounded-xl border border-[#E0D4C1] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F382C]/30 text-xs sm:text-sm"
                />
              </div>

              {/* Order Preview Box */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E8DCC9] space-y-1.5">
                <span className="text-[11px] font-bold text-[#8C6D3B] block">
                  {lang === 'ar' ? 'معاينة رسالة الطلب:' : 'Order Message Preview:'}
                </span>
                <pre className="whitespace-pre-wrap font-readex text-[11px] text-[#2D332F] leading-relaxed">
                  {formattedOrderMessage}
                </pre>
              </div>

              {orderError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {orderError}
                </div>
              )}

              {orderSubmitted && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {lang === 'ar'
                      ? 'تم فتح واتساب برسالة طلبك. يمكنك أيضاً نسخ تفاصيل الطلب احتياطاً.'
                      : 'WhatsApp has been opened with your order details. You may also copy the summary below.'}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 sm:px-8 py-4 bg-[#FAF6EE] border-t border-[#E8DCC9] flex flex-wrap items-center justify-between gap-3 font-readex text-xs">
              <button
                type="button"
                onClick={handleCopyOrder}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#C5A880]/60 text-[#0F382C] hover:bg-[#F4EFE6] font-semibold flex items-center gap-1.5 transition"
              >
                {orderCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">{t('order_copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#A58455]" />
                    <span>{t('copy_order_details')}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseOrderModal}
                  className="px-4 py-2.5 rounded-xl text-[#1E1E1E] hover:bg-[#E8DCC9]/50"
                >
                  {t('close_modal')}
                </button>

                {sanitizedWhatsapp ? (
                  <a
                    href={whatsappOrderHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => {
                      if (!validateAndPrepareOrder()) {
                        e.preventDefault();
                        return;
                      }
                      setOrderSubmitted(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold flex items-center gap-2 shadow transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{t('send_order_whatsapp')}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleCopyOrder}
                    className="px-5 py-2.5 rounded-xl bg-[#0F382C] text-white font-bold flex items-center gap-2 shadow"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{t('copy_order_details')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
