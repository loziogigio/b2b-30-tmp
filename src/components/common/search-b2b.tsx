import { forwardRef, useEffect, useState } from 'react';
import cn from 'classnames';
import { useSearchQuery } from '@framework/product/use-search';
import SearchBox from '@components/common/search-box';
import SearchProduct from '@components/common/search-product';
import SearchResultLoader from '@components/ui/loaders/search-result-loader';
import useFreezeBodyScroll from '@utils/use-freeze-body-scroll';
import Scrollbar from '@components/ui/scrollbar';
import { useUI } from '@contexts/ui.context';
import { Product } from '@framework/types';
import SearchBoxB2B from './search-box-b2b';
import { useSearchParams } from 'next/navigation';
import SearchOverlayB2B from '@components/search/search-overlay-b2b';

type Props = {
  lang: string;
  className?: string;
  searchId?: string;
  variant?: 'border' | 'fill';
};

const SearchB2B = forwardRef<HTMLDivElement, Props>(
  (
    {
      className = 'md:w-[730px] 2xl:w-[800px]',
      searchId = 'search',
      variant = 'border',
      lang,
    },
    ref,
  ) => {
    const {
      displayMobileSearch,
      closeMobileSearch,
      displaySearch,
      closeSearch,
    } = useUI();
    const [searchText, setSearchText] = useState('');
    const searchParams = useSearchParams();
    const [inputFocus, setInputFocus] = useState<boolean>(false);
    const { data, isLoading } = useSearchQuery({
      text: searchText,
    });
    useFreezeBodyScroll(
      inputFocus === true || displaySearch || displayMobileSearch,
    );
    function handleSearch(e: React.SyntheticEvent) {
      e.preventDefault();
    }
    function handleAutoSearch(e: React.FormEvent<HTMLInputElement>) {
      setSearchText(e.currentTarget.value);
    }
    const RECENT_KEY = 'b2b-recent-searches';
    function pushRecent(term: string) {
      const t = term.trim();
      if (!t) return;
      try {
        const raw = localStorage.getItem(RECENT_KEY);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        const next = [t, ...arr.filter((x) => x !== t)].slice(0, 10);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
    }

    function clear() {
      setSearchText('');
      setInputFocus(false);
      closeMobileSearch();
      closeSearch();
    }
    function enableInputFocus() {
      setInputFocus(true);
    }
    function disableInputFocus() {
      setInputFocus(false);          // ✅ hides overlay
      closeMobileSearch();           // ✅ closes mobile overlay if open
      closeSearch();                 // ✅ closes desktop overlay if open
    }

    // Sync input with URL param `text` when present (non-empty). Also reacts to tab changes.
    useEffect(() => {
      const urlText = (searchParams?.get('text') || '').trim();
      if (urlText && urlText !== searchText) {
        setSearchText(urlText);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
    

    return (
      <div
        ref={ref}
        className={cn(
          'w-full transition-all duration-200 ease-in-out',
          className,
        )}
      >
        <div
          className={cn(
            'overlay cursor-pointer invisible w-full h-full opacity-0 flex top-0 ltr:left-0 rtl:right-0 transition-all duration-300 fixed',
            {
              open: displayMobileSearch,
              'input-focus-overlay-open': inputFocus === true,
              'open-search-overlay': displaySearch,
            },
          )}
          onClick={() => disableInputFocus()}
        />
        {/* End of overlay */}

        <div className="relative z-30 flex flex-col justify-center w-full shrink-0">
          <div className="flex flex-col w-full mx-auto">
            <SearchBoxB2B
              searchId={searchId}
              name="search"
              value={searchText}
              onSubmit={handleSearch}
              onChange={handleAutoSearch}
              onClear={clear}
              onFocus={() => enableInputFocus()}
              onSubmitSuccess={() => {
                pushRecent(searchText);
                disableInputFocus();
              }}
              variant={variant}
              lang={lang}
            />
          </div>
          {/* End of searchbox */}
          {/* Full overlay content (suggestions + recommended) */}
          <SearchOverlayB2B
            lang={lang}
            open={inputFocus === true || displaySearch}
            onClose={disableInputFocus}
            value={searchText}
            onChange={handleAutoSearch}
            onClear={clear}
            onSubmitSuccess={() => {
              pushRecent(searchText);
            }}
          />
{/* 
          {searchText && (
            <div className="w-full absolute top-[56px] ltr:left-0 rtl:right-0 bg-brand-light rounded-md flex flex-col overflow-hidden shadow-dropDown z-30">
              <Scrollbar className="os-host-flexbox">
                <div className="w-full max-h-[380px]">
                  {isLoading
                    ? Array.from({ length: 15 }).map((_, idx) => (
                        <div
                          key={`search-result-loader-key-${idx}`}
                          className="py-2.5 ltr:pl-5 rtl:pr-5 ltr:pr-10 rtl:pl-10 scroll-snap-align-start"
                        >
                          <SearchResultLoader
                            key={idx}
                            uniqueKey={`top-search-${idx}`}
                          />
                        </div>
                      ))
                    : data?.map((item: Product[], index: number) => (
                        <div
                          key={`search-result-key-${index}`}
                          className="py-2.5 ltr:pl-5 rtl:pr-5 ltr:pr-10 rtl:pl-10 scroll-snap-align-start transition-colors duration-200 hover:bg-fill-base"
                          onClick={clear}
                        >
                          <SearchProduct item={item} key={index} lang={lang} />
                        </div>
                      ))}
                </div>
              </Scrollbar>
            </div>
          )} */}
          {/* End of search result */}
        </div>
      </div>
    );
  },
);

SearchB2B.displayName = 'SearchB2B';
export default SearchB2B;
