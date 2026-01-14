'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEliaSearch } from '@framework/elia/use-elia-search';
import { useEliaAnalyze } from '@framework/elia/use-elia-analyze';
import type {
  EliaSearchResponse,
  EliaReasoningStep,
  EliaProduct,
  AnalyzedProduct,
  EliaAnalyzeResponse,
} from '@framework/elia/types';
import { SORT_LABELS, STOCK_FILTER_LABELS } from '@framework/elia/types';
import { EliaReasoningSteps } from '@components/elia/elia-reasoning-steps';
import { EliaInput } from '@components/elia/input';
import { AiOutlineClose, AiOutlineSearch, AiOutlineUser } from 'react-icons/ai';
import {
  BsStars,
  BsChevronDown,
  BsSortDown,
  BsBox,
  BsBoxSeam,
  BsCheckCircle,
  BsLightningCharge,
} from 'react-icons/bs';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useUI } from '@contexts/ui.context';
import { useModalAction } from '@components/common/modal/modal.context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  searchResult?: EliaSearchResponse['data'];
  analyzeResult?: EliaAnalyzeResponse['data'];
  reasoningSteps?: EliaReasoningStep[];
  timestamp: Date;
}

// Product card component for search results (basic)
function EliaProductCard({
  product,
  onOpenPopup,
}: {
  product: EliaProduct;
  onOpenPopup: (product: EliaProduct) => void;
}) {
  const imageUrl =
    product.cover_image_url ||
    product.image?.thumbnail ||
    '/assets/placeholder/product.svg';
  const price = product.price_discount || product.price || product.net_price;

  return (
    <button
      onClick={() => onOpenPopup(product)}
      className="w-full flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 text-left"
    >
      <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.name}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product.name}
        </p>
        {product.brand?.label && (
          <p className="text-xs text-gray-500">{product.brand.label}</p>
        )}
        {product.model && (
          <p className="text-xs text-gray-400">{product.model}</p>
        )}
        {price && (
          <p className="text-sm font-semibold text-blue-600 mt-0.5">
            €{Number(price).toFixed(2)}
          </p>
        )}
      </div>
    </button>
  );
}

// Analyzed product card with AI match score and reasons
function EliaAnalyzedProductCard({
  analyzed,
  product,
  onOpenPopup,
}: {
  analyzed: AnalyzedProduct;
  product?: EliaProduct;
  onOpenPopup: (product: EliaProduct) => void;
}) {
  // Product info comes from search results (passed as product prop)
  const name = product?.name || analyzed.entity_code;
  const imageUrl =
    product?.cover_image_url ||
    product?.image?.thumbnail ||
    '/assets/placeholder/product.svg';
  const brandName = product?.brand?.label;
  // Price from search result (ERP-enriched)
  const price = product?.price_discount || product?.price || product?.net_price;

  const scorePercent = Math.round(analyzed.attribute_match_score * 100);
  const scoreColor =
    scorePercent >= 90
      ? 'text-green-600 bg-green-50'
      : scorePercent >= 70
        ? 'text-yellow-600 bg-yellow-50'
        : 'text-gray-600 bg-gray-50';

  const handleClick = () => {
    if (product) onOpenPopup(product);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={handleClick}
        className="w-full flex gap-3 p-2 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            <span
              className={cn(
                'text-xs font-bold px-1.5 py-0.5 rounded',
                scoreColor,
              )}
            >
              {scorePercent}%
            </span>
          </div>
          {brandName && <p className="text-xs text-gray-500">{brandName}</p>}
          {product?.model && (
            <p className="text-xs text-gray-400">{product.model}</p>
          )}
          {price && (
            <p className="text-sm font-semibold text-blue-600 mt-0.5">
              €{Number(price).toFixed(2)}
            </p>
          )}
        </div>
      </button>
      {/* Match reasons */}
      {analyzed.match_reasons.length > 0 && (
        <div className="px-2 pb-2 space-y-1">
          {analyzed.match_reasons.slice(0, 2).map((reason, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-gray-600"
            >
              <BsCheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          ))}
          {analyzed.ranking_reason && (
            <div className="flex items-start gap-1.5 text-xs text-indigo-600">
              <BsLightningCharge className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{analyzed.ranking_reason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EliaDrawer() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(
    null,
  );
  const [expandedProducts, setExpandedProducts] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const { isAuthorized } = useUI();

  // Prevent hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);
  const { openModal } = useModalAction();
  const {
    search,
    isSearching,
    searchResult,
    reasoningSteps: searchSteps,
    error: searchError,
    reset: resetSearch,
  } = useEliaSearch();
  const {
    analyze,
    isAnalyzing,
    analyzeResult,
    reasoningSteps: analyzeSteps,
    error: analyzeError,
    reset: resetAnalyze,
  } = useEliaAnalyze();

  // Open product popup - transform EliaProduct to match ProductPopup expectations
  const handleOpenProductPopup = (product: EliaProduct) => {
    const popupProduct = {
      ...product,
      // Use entity_code for ERP price lookup (ProductPopup uses product.id)
      id: product.entity_code || product.id,
      sku: product.sku || product.entity_code,
      // ProductPopup checks gallery array first, then falls back to image.original
      gallery: [],
      image: {
        original:
          product.cover_image_url ||
          product.image?.original ||
          product.image?.large ||
          product.image?.thumbnail ||
          '/product-placeholder.svg',
        thumbnail:
          product.image?.thumbnail ||
          product.cover_image_url ||
          '/product-placeholder.svg',
      },
      description: product.short_description || product.description || '',
    };
    openModal('PRODUCT_VIEW', popupProduct);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingAnalyzeRef = useRef<boolean>(false);

  // Combined reasoning steps
  const allReasoningSteps = [...searchSteps, ...analyzeSteps];
  const isProcessing = isSearching || isAnalyzing;
  const error = searchError || analyzeError;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, allReasoningSteps]);

  // When search completes, auto-trigger analyze if user is authorized
  useEffect(() => {
    if (searchResult && !isSearching && !pendingAnalyzeRef.current) {
      pendingAnalyzeRef.current = true;

      if (isAuthorized && searchResult.products.length > 0) {
        // Trigger Step 3: Analyze with ERP prices
        analyze(
          searchResult.products,
          searchResult.intent,
          searchResult.total_found,
          'it',
        );
      } else {
        // Not authorized or no products - just show search results
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: searchResult.intent.user_message,
          searchResult: searchResult,
          reasoningSteps: [...searchSteps],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setExpandedProducts(assistantMessage.id);
        pendingAnalyzeRef.current = false;
      }
    }
  }, [searchResult, isSearching, isAuthorized]);

  // When analyze completes, add final message with both results
  useEffect(() => {
    if (
      analyzeResult &&
      !isAnalyzing &&
      searchResult &&
      pendingAnalyzeRef.current
    ) {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: searchResult.intent.user_message, // Use user_message, summary is shown in analyze box
        searchResult: searchResult,
        analyzeResult: analyzeResult,
        reasoningSteps: [...searchSteps, ...analyzeSteps],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setExpandedProducts(assistantMessage.id);
      pendingAnalyzeRef.current = false;
    }
  }, [analyzeResult, isAnalyzing]);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setCurrentQuery(text);
    pendingAnalyzeRef.current = false;

    // Perform full search (Step 2)
    await search(text, 'it');
  };

  const handleReset = () => {
    resetSearch();
    resetAnalyze();
    pendingAnalyzeRef.current = false;
  };

  // Hide in preview mode
  if (isPreview) {
    return null;
  }

  return (
    <>
      {/* Floating Button - Attached to right side */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40',
          'bg-gradient-to-r from-blue-600 to-indigo-600',
          'text-white shadow-lg',
          'rounded-l-lg',
          'p-3 pl-4',
          'hover:pl-6 hover:shadow-xl',
          'transition-all duration-300',
          'flex items-center gap-2',
          'group',
          isOpen && 'opacity-0 pointer-events-none',
        )}
      >
        <span className="text-sm font-medium whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[100px] transition-all duration-300">
          ELIA
        </span>
        <div className="relative">
          <AiOutlineSearch className="w-6 h-6" />
          <BsStars className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
        </div>
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer - Slides from right */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[33vw] min-w-[320px] max-w-[500px] bg-white shadow-2xl z-50',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="relative">
                  <AiOutlineSearch className="w-5 h-5" />
                  <BsStars className="w-2.5 h-2.5 absolute -top-1 -right-1 text-yellow-300" />
                </div>
                ELIA Classic
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Beta 0.1
                </span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Ricerca intelligente con AI
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
            >
              <AiOutlineClose className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Login required state */}
            {(!mounted || !isAuthorized) && (
              <div className="text-center text-gray-500 mt-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <AiOutlineSearch className="w-16 h-16 text-gray-200" />
                  <BsStars className="w-6 h-6 absolute -top-1 -right-1 text-blue-400" />
                </div>
                <p className="text-base font-medium text-gray-700">
                  Accedi per usare ELIA
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  La ricerca intelligente è disponibile solo per utenti
                  registrati
                </p>
                <button
                  onClick={() => openModal('LOGIN_VIEW')}
                  className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Accedi
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  Non hai un account?{' '}
                  <button
                    onClick={() => openModal('SIGN_UP_VIEW')}
                    className="text-blue-600 hover:underline"
                  >
                    Registrati
                  </button>
                </p>
              </div>
            )}

            {/* Empty state */}
            {mounted &&
              isAuthorized &&
              messages.length === 0 &&
              !isProcessing && (
                <div className="text-center text-gray-500 mt-8">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <AiOutlineSearch className="w-16 h-16 text-gray-200" />
                    <BsStars className="w-6 h-6 absolute -top-1 -right-1 text-blue-400" />
                  </div>
                  <p className="text-base font-medium text-gray-700">
                    Cosa stai cercando?
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Descrivi il prodotto che ti serve
                  </p>
                  <div className="mt-6 space-y-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Prova con:
                    </p>
                    <button
                      onClick={() => {
                        handleReset();
                        handleSendMessage('lavabo bianco per un bagno piccolo');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline block mx-auto py-1"
                    >
                      "lavabo bianco per un bagno piccolo"
                    </button>
                    <button
                      onClick={() => {
                        handleReset();
                        handleSendMessage(
                          'caldaia per 100 m2 di appartamento a basso prezzo',
                        );
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline block mx-auto py-1"
                    >
                      "caldaia per 100 m² a basso prezzo"
                    </button>
                    <button
                      onClick={() => {
                        handleReset();
                        handleSendMessage(
                          'condizionatore a basso consumo per 100m2',
                        );
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline block mx-auto py-1"
                    >
                      "condizionatore a basso consumo per 100m2"
                    </button>
                  </div>
                </div>
              )}

            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {message.role === 'user' ? (
                  // User message
                  <div className="flex justify-end">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <AiOutlineUser className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Assistant message
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2 max-w-full w-full">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <BsStars className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <p className="text-sm text-gray-800">
                            {message.content}
                          </p>
                        </div>

                        {/* Reasoning steps accordion */}
                        {message.reasoningSteps &&
                          message.reasoningSteps.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() =>
                                  setExpandedReasoning(
                                    expandedReasoning === message.id
                                      ? null
                                      : message.id,
                                  )
                                }
                                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-xs"
                              >
                                <span className="text-gray-600 font-medium">
                                  Ragionamento AI
                                </span>
                                <BsChevronDown
                                  className={cn(
                                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                                    expandedReasoning === message.id &&
                                      'rotate-180',
                                  )}
                                />
                              </button>
                              <div
                                className={cn(
                                  'overflow-hidden transition-all duration-200',
                                  expandedReasoning === message.id
                                    ? 'max-h-[500px]'
                                    : 'max-h-0',
                                )}
                              >
                                <div className="p-2">
                                  <EliaReasoningSteps
                                    steps={message.reasoningSteps}
                                    className="!p-2 !shadow-none !border-0"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Search result details */}
                        {message.searchResult && (
                          <>
                            {/* Intent summary */}
                            <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">
                                  Risultati:
                                </span>
                                <span className="font-medium text-blue-600">
                                  {message.searchResult.total_found} prodotti
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Tipo:</span>
                                <span className="font-medium text-gray-700 capitalize">
                                  {message.searchResult.intent.intent_type}
                                </span>
                              </div>
                              <div className="pt-2 border-t">
                                <span className="text-gray-500 block mb-1">
                                  Termini di ricerca:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {message.searchResult.matched_products?.map(
                                    (kw, i) => (
                                      <span
                                        key={`p-${i}`}
                                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs"
                                      >
                                        {kw}
                                      </span>
                                    ),
                                  )}
                                  {message.searchResult.matched_attributes?.map(
                                    (kw, i) => (
                                      <span
                                        key={`a-${i}`}
                                        className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs"
                                      >
                                        {kw}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                              {/* Sort & Stock preferences */}
                              {(message.searchResult.intent.sort_by !==
                                'relevance' ||
                                message.searchResult.intent.stock_filter !==
                                  'any') && (
                                <div className="pt-2 border-t flex flex-wrap gap-2">
                                  {message.searchResult.intent.sort_by &&
                                    message.searchResult.intent.sort_by !==
                                      'relevance' && (
                                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                        <BsSortDown className="w-3 h-3" />
                                        {
                                          SORT_LABELS[
                                            message.searchResult.intent.sort_by
                                          ]
                                        }
                                      </span>
                                    )}
                                  {message.searchResult.intent.stock_filter &&
                                    message.searchResult.intent.stock_filter !==
                                      'any' && (
                                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                        <BsBox className="w-3 h-3" />
                                        {
                                          STOCK_FILTER_LABELS[
                                            message.searchResult.intent
                                              .stock_filter
                                          ]
                                        }
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>

                            {/* AI Analysis Summary (if available) */}
                            {message.analyzeResult && (
                              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <BsStars className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm text-indigo-800">
                                    {message.analyzeResult.summary}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* No results message */}
                            {message.searchResult.total_found === 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <BsBox className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm text-amber-800">
                                    Nessun prodotto trovato. Prova con termini
                                    diversi o meno specifici.
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Products accordion - Show analyzed if available, otherwise search results */}
                            {(message.analyzeResult?.products.length ||
                              message.searchResult.products.length > 0) && (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    setExpandedProducts(
                                      expandedProducts === message.id
                                        ? null
                                        : message.id,
                                    )
                                  }
                                  className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors text-xs"
                                >
                                  <span className="text-blue-700 font-medium flex items-center gap-1.5">
                                    <BsBoxSeam className="w-3.5 h-3.5" />
                                    {message.analyzeResult
                                      ? `${message.analyzeResult.total_count} Prodotti analizzati`
                                      : `${message.searchResult.products.length} Prodotti trovati`}
                                  </span>
                                  <BsChevronDown
                                    className={cn(
                                      'w-4 h-4 text-blue-400 transition-transform duration-200',
                                      expandedProducts === message.id &&
                                        'rotate-180',
                                    )}
                                  />
                                </button>
                                <div
                                  className={cn(
                                    'overflow-hidden transition-all duration-300',
                                    expandedProducts === message.id
                                      ? 'max-h-[800px] overflow-y-auto'
                                      : 'max-h-0',
                                  )}
                                >
                                  <div className="p-2 space-y-2">
                                    {message.analyzeResult ? (
                                      // Show analyzed products with scores
                                      <>
                                        {message.analyzeResult.products
                                          .slice(0, 10)
                                          .map((analyzed) => {
                                            const originalProduct =
                                              message.searchResult?.products.find(
                                                (p) =>
                                                  (p.entity_code || p.id) ===
                                                  analyzed.entity_code,
                                              );
                                            return (
                                              <EliaAnalyzedProductCard
                                                key={analyzed.entity_code}
                                                analyzed={analyzed}
                                                product={originalProduct}
                                                onOpenPopup={
                                                  handleOpenProductPopup
                                                }
                                              />
                                            );
                                          })}
                                        {message.analyzeResult.products.length >
                                          10 && (
                                          <p className="text-xs text-gray-400 text-center py-2">
                                            +
                                            {message.analyzeResult.products
                                              .length - 10}{' '}
                                            altri prodotti
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      // Show basic search results
                                      <>
                                        {message.searchResult.products
                                          .slice(0, 10)
                                          .map((product) => (
                                            <EliaProductCard
                                              key={product.id}
                                              product={product}
                                              onOpenPopup={
                                                handleOpenProductPopup
                                              }
                                            />
                                          ))}
                                        {message.searchResult.products.length >
                                          10 && (
                                          <p className="text-xs text-gray-400 text-center py-2">
                                            +
                                            {message.searchResult.products
                                              .length - 10}{' '}
                                            altri prodotti
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Reasoning steps (while processing) */}
            {isProcessing && allReasoningSteps.length > 0 && (
              <EliaReasoningSteps steps={allReasoningSteps} />
            )}

            {/* Error message */}
            {error && !isProcessing && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p className="font-medium">Errore</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input - only show when authorized */}
          {mounted && isAuthorized && (
            <div className="p-4 border-t bg-gray-50">
              <EliaInput
                onSend={(text) => {
                  handleReset();
                  handleSendMessage(text);
                }}
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Premi Invio per cercare • Shift+Invio per nuova riga
              </p>
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 text-center border border-amber-200">
                ⚠️ Le risposte AI potrebbero contenere errori. Verifica sempre
                le informazioni.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
